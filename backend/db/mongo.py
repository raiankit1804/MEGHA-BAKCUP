"""
WeatherGPT v2.0 — MongoDB Client & Document Models (with Memory Fallback)
Stores: user profiles, opt-in chat history.
IMPORTANT: This database is for user-facing app data ONLY.
Meteorological records go to PostgreSQL/SQLite — see postgres.py.
If MongoDB server is not running, falls back automatically to in-memory store.
"""

from datetime import datetime
import logging
from typing import Optional, Any
import uuid
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from bson import ObjectId

from config import settings

logger = logging.getLogger(__name__)

# ─── Client Singleton & Memory Store ──────────────────────────────────────────

_client: Optional[AsyncIOMotorClient] = None
_database: Optional[AsyncIOMotorDatabase] = None

_memory_users: dict[str, dict] = {}           # user_id -> doc
_memory_chat_history: list[dict] = []         # list of ChatHistoryDoc dicts


async def connect_mongo() -> None:
    global _client, _database
    try:
        _client = AsyncIOMotorClient(
            settings.mongodb_url,
            serverSelectionTimeoutMS=2000,
        )
        _database = _client.weathergpt
        # Test connection
        await _client.admin.command('ping')
        await _ensure_indexes()
        logger.info("✅ MongoDB connected: %s", settings.mongodb_url)
    except Exception as exc:
        logger.warning("⚠️ MongoDB server not available (%s). Using in-memory fallback.", exc)
        _client = None
        _database = None


async def close_mongo() -> None:
    global _client
    if _client:
        try:
            _client.close()
        except Exception:
            pass
        _client = None


def get_db() -> Optional[AsyncIOMotorDatabase]:
    return _database


async def _ensure_indexes() -> None:
    db = get_db()
    if db is not None:
        try:
            await db.user_profiles.create_index("google_sub", unique=True)
            await db.user_profiles.create_index("email")
            await db.chat_history.create_index([("user_id", 1), ("session_id", 1)])
            await db.chat_history.create_index("timestamp")
            await db.chat_history.create_index("user_id")
        except Exception as exc:
            logger.warning("Mongo index creation warning: %s", exc)


# ─── UserProfile ─────────────────────────────────────────────────────────────

class UserProfile(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    google_sub: str
    name: str
    email: str
    avatar_url: Optional[str] = None
    color_scheme: str = "dark"
    interface_style: str = "modern"
    default_language: str = "en"
    history_opt_in: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_seen_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}


class UserProfileUpdate(BaseModel):
    color_scheme: Optional[str] = None
    interface_style: Optional[str] = None
    default_language: Optional[str] = None
    history_opt_in: Optional[bool] = None


# ─── ChatHistoryDoc ──────────────────────────────────────────────────────────

class ChatHistoryDoc(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user_id: str
    session_id: str
    role: str
    turn_type: str
    text_en: str
    text_native: Optional[str] = None
    native_language: Optional[str] = None
    domain_filter: str = "normal"
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}


# ─── CRUD helpers ────────────────────────────────────────────────────────────

async def upsert_user_profile(profile: UserProfile) -> str:
    """Create or update user profile. Returns the user _id as string."""
    db = get_db()
    data = profile.model_dump(exclude={"id"})
    data["last_seen_at"] = datetime.utcnow()

    if db is not None:
        result = await db.user_profiles.find_one_and_update(
            {"google_sub": profile.google_sub},
            {"$set": data, "$setOnInsert": {"created_at": datetime.utcnow()}},
            upsert=True,
            return_document=True,
        )
        return str(result["_id"])

    # In-memory fallback
    for uid, doc in _memory_users.items():
        if doc.get("google_sub") == profile.google_sub:
            doc.update(data)
            return uid
    uid = str(ObjectId())
    data["_id"] = uid
    data["created_at"] = datetime.utcnow()
    _memory_users[uid] = data
    return uid


async def get_user_by_google_sub(google_sub: str) -> Optional[dict]:
    db = get_db()
    if db is not None:
        return await db.user_profiles.find_one({"google_sub": google_sub})
    for uid, doc in _memory_users.items():
        if doc.get("google_sub") == google_sub:
            return doc
    return None


async def get_user_by_id(user_id: str) -> Optional[dict]:
    db = get_db()
    if db is not None:
        try:
            return await db.user_profiles.find_one({"_id": ObjectId(user_id)})
        except Exception:
            return None
    return _memory_users.get(user_id)


async def update_user_profile(user_id: str, updates: UserProfileUpdate) -> None:
    db = get_db()
    data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if not data:
        return
    if db is not None:
        try:
            await db.user_profiles.update_one({"_id": ObjectId(user_id)}, {"$set": data})
            return
        except Exception as exc:
            logger.warning("MongoDB update failed: %s", exc)
    if user_id in _memory_users:
        _memory_users[user_id].update(data)


async def write_chat_message(doc: ChatHistoryDoc) -> None:
    """Write a single chat turn. Called only when history_opt_in == True."""
    db = get_db()
    data = doc.model_dump(exclude={"id"})
    if db is not None:
        try:
            await db.chat_history.insert_one(data)
            return
        except Exception as exc:
            logger.warning("MongoDB insert failed: %s", exc)
    _memory_chat_history.append(data)


async def get_user_history(user_id: str, limit: int = 100) -> list[dict]:
    db = get_db()
    if db is not None:
        try:
            cursor = db.chat_history.find(
                {"user_id": user_id}, sort=[("timestamp", -1)], limit=limit
            )
            return await cursor.to_list(length=limit)
        except Exception as exc:
            logger.warning("MongoDB query failed: %s", exc)
    history = [d for d in _memory_chat_history if d.get("user_id") == user_id]
    history.sort(key=lambda x: x.get("timestamp", datetime.min), reverse=True)
    return history[:limit]


async def clear_user_history(user_id: str) -> int:
    """Delete ALL chat history for a user. Returns count deleted."""
    global _memory_chat_history
    db = get_db()
    if db is not None:
        try:
            result = await db.chat_history.delete_many({"user_id": user_id})
            return result.deleted_count
        except Exception as exc:
            logger.warning("MongoDB delete failed: %s", exc)
    count = len([d for d in _memory_chat_history if d.get("user_id") == user_id])
    _memory_chat_history = [d for d in _memory_chat_history if d.get("user_id") != user_id]
    return count


async def get_personalization_summary(user_id: str) -> dict:
    history = await get_user_history(user_id, limit=20)
    user_turns = [d for d in history if d.get("role") == "user"]
    if not user_turns:
        return {"top_locations": [], "top_filter": "normal"}
    locations = [d.get("location_name") for d in user_turns if d.get("location_name")]
    filters = [d.get("domain_filter") for d in user_turns if d.get("domain_filter")]
    top_loc = max(set(locations), key=locations.count) if locations else None
    top_filt = max(set(filters), key=filters.count) if filters else "normal"
    return {"top_location": top_loc, "top_filter": top_filt}
