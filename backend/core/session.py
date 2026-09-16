"""
WeatherGPT v2.0 — Session Manager (Redis-backed)
One session per conversation holds all context that persists across turns:
- sessionLocation, language, domainFilter, interfaceStyle, colorScheme
- Message history with all language variants
Location resolution order enforced here: explicit > session > GPS > IP (never silent overwrite).
"""

import uuid
import logging
from typing import Optional
from datetime import datetime, timezone

from db.redis_client import session_get, session_set, session_delete, session_touch

logger = logging.getLogger(__name__)


def new_session_id() -> str:
    return f"sess_{uuid.uuid4().hex[:16]}"


def _default_session(session_id: str) -> dict:
    return {
        "session_id": session_id,
        "sessionLocation": None,          # {name, latitude, longitude, state, source}
        "language": "en",
        "domainFilter": "normal",
        "interfaceStyle": "modern",
        "colorScheme": "dark",
        "messages": [],                    # list of message dicts
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_active": datetime.now(timezone.utc).isoformat(),
        "turn_count": 0,
    }


async def get_or_create_session(session_id: Optional[str] = None) -> dict:
    """Load existing session or create a fresh one."""
    if session_id:
        data = await session_get(session_id)
        if data:
            await session_touch(session_id)
            return data
    # Create new
    sid = session_id or new_session_id()
    session = _default_session(sid)
    await session_set(sid, session)
    return session


async def save_session(session: dict) -> None:
    session["last_active"] = datetime.now(timezone.utc).isoformat()
    await session_set(session["session_id"], session)


async def destroy_session(session_id: str) -> None:
    await session_delete(session_id)


def is_in_india(lat: Optional[float], lon: Optional[float]) -> bool:
    if lat is None or lon is None:
        return False
    return 6.0 <= lat <= 37.5 and 68.0 <= lon <= 97.5


def resolve_location(
    session: dict,
    explicit_location: Optional[dict] = None,   # from current message/query
    gps_location: Optional[dict] = None,         # from device GPS (with permission)
    ip_location: Optional[dict] = None,          # from IP geolocation (approximate)
) -> dict:
    """
    Location resolution order (strict):
    1. Explicitly named in current query (highest priority, always wins)
    2. sessionLocation already set in this session (validated within India)
    3. GPS (with permission, labeled "gps", validated within India)
    4. IP fallback (labeled "approximate", validated within India)
    5. Default fallback: Bengaluru, Karnataka

    GPS/IP NEVER silently overwrites an explicit or session location.
    Out-of-bounds coordinates (e.g. outside India) are purged/ignored.
    """
    if explicit_location and explicit_location.get("name"):
        loc = {**explicit_location, "source": "explicit"}
        session["sessionLocation"] = loc
        return loc

    cur_sess = session.get("sessionLocation")
    if cur_sess:
        lat = cur_sess.get("latitude")
        lon = cur_sess.get("longitude")
        # Ensure sessionLocation is actually within India
        if is_in_india(lat, lon):
            return cur_sess
        else:
            logger.warning("Purging out-of-India sessionLocation (%s, %s) from session", lat, lon)
            session["sessionLocation"] = None

    if gps_location and gps_location.get("latitude") and gps_location.get("longitude"):
        lat = gps_location["latitude"]
        lon = gps_location["longitude"]
        if is_in_india(lat, lon):
            loc = {**gps_location, "source": "gps"}
            session["sessionLocation"] = loc
            return loc
        else:
            logger.warning("Ignoring GPS coordinates (%s, %s) outside India", lat, lon)

    if ip_location and ip_location.get("latitude") and ip_location.get("longitude"):
        lat = ip_location["latitude"]
        lon = ip_location["longitude"]
        if is_in_india(lat, lon):
            loc = {**ip_location, "source": "approximate", "approximate": True}
            session["sessionLocation"] = loc
            return loc

    # Default fallback — Bengaluru, Karnataka (primary tech & research hub for WeatherGPT)
    default_loc = {
        "name": "Bengaluru, Karnataka",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "state": "Karnataka",
        "source": "default",
    }
    session["sessionLocation"] = default_loc
    return default_loc


def add_message(
    session: dict,
    role: str,                          # "user" | "assistant"
    turn_type: str,                     # "establishing" | "followup"
    text_en: str,
    text_native: Optional[str] = None,
    native_language: Optional[str] = None,
    domain_filter: Optional[str] = None,
    weather_data: Optional[dict] = None,
    warnings: Optional[list] = None,
    risks: Optional[list] = None,
    followup_chips_native: Optional[list] = None,
    followup_chips_english: Optional[list] = None,
    requires_chart: bool = False,
    chart_data: Optional[dict] = None,
) -> dict:
    """
    Add a message to session history.
    Messages store all language variants to allow instant client-side language switching.
    """
    message = {
        "id": f"msg_{uuid.uuid4().hex[:8]}",
        "role": role,
        "turn_type": turn_type,
        "domain_filter": domain_filter or session.get("domainFilter", "normal"),
        "variants": {
            "en": text_en,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    if text_native and native_language and native_language != "en":
        message["variants"][native_language] = text_native

    if role == "assistant":
        message["weather_data"] = weather_data
        message["warnings"] = warnings or []
        message["risks"] = risks or []
        message["followup_chips_native"] = followup_chips_native or []
        message["followup_chips_english"] = followup_chips_english or []
        message["requires_chart"] = requires_chart
        message["chart_data"] = chart_data

    session["messages"].append(message)
    session["turn_count"] = session.get("turn_count", 0) + 1

    # Keep last 50 messages in session (older messages should be in MongoDB history)
    if len(session["messages"]) > 50:
        session["messages"] = session["messages"][-50:]

    return message


def get_current_text(message: dict, language: str) -> str:
    """
    Get message text in the requested language.
    Falls back to English if variant not yet generated.
    """
    variants = message.get("variants", {})
    return variants.get(language) or variants.get("en", "")


def set_language_variant(message: dict, language: str, text: str) -> None:
    """Cache a newly generated language variant on an existing message."""
    if "variants" not in message:
        message["variants"] = {}
    message["variants"][language] = text


def determine_turn_type(session: dict) -> str:
    """
    First assistant message → 'establishing' (renders full weather card).
    All subsequent assistant messages → 'followup' (renders as bubble).
    """
    assistant_messages = [m for m in session.get("messages", []) if m.get("role") == "assistant"]
    return "followup" if assistant_messages else "establishing"
