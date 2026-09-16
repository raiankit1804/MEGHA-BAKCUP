"""
WeatherGPT v2.0 — Redis Cache Client (with Memory Fallback)
IMPORTANT: Redis is cache-only in this system. It is NEVER a source of record.
Meteorological records → PostgreSQL/SQLite. User data → MongoDB/Memory.
Redis holds: session state (TTL) + weather response cache (TTL).
If Redis server is not running, falls back automatically to memory cache.
"""

import json
import logging
import time
from typing import Any, Optional
import redis.asyncio as aioredis

from config import settings

logger = logging.getLogger(__name__)

# ─── Client & Memory Fallback Singleton ───────────────────────────────────────

_redis: Optional[aioredis.Redis] = None
_memory_cache: dict[str, tuple[Any, float]] = {}  # key -> (value, expires_at)


async def connect_redis() -> None:
    global _redis
    try:
        _redis = await aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        await _redis.ping()
        logger.info("✅ Redis connected: %s", settings.redis_url)
    except Exception as exc:
        logger.warning("⚠️ Redis server not available (%s). Using in-memory fallback cache.", exc)
        _redis = None


async def close_redis() -> None:
    global _redis
    if _redis:
        try:
            await _redis.aclose()
        except Exception:
            pass
        _redis = None


# ─── Generic TTL Helpers ──────────────────────────────────────────────────────

async def cache_get(key: str) -> Optional[Any]:
    """Return deserialized value or None if missing/expired."""
    global _redis, _memory_cache
    if _redis is not None:
        try:
            raw = await _redis.get(key)
            return json.loads(raw) if raw is not None else None
        except Exception as exc:
            logger.warning("Redis GET failed for key=%s: %s", key, exc)

    # In-memory fallback
    item = _memory_cache.get(key)
    if item is not None:
        val, expires_at = item
        if expires_at > time.time():
            return val
        del _memory_cache[key]
    return None


async def cache_set(key: str, value: Any, ttl_seconds: int) -> None:
    """Serialize and store value with TTL."""
    global _redis, _memory_cache
    if _redis is not None:
        try:
            await _redis.setex(key, ttl_seconds, json.dumps(value, default=str))
            return
        except Exception as exc:
            logger.warning("Redis SET failed for key=%s: %s", key, exc)

    # In-memory fallback
    _memory_cache[key] = (value, time.time() + ttl_seconds)


async def cache_delete(key: str) -> None:
    global _redis, _memory_cache
    if _redis is not None:
        try:
            await _redis.delete(key)
        except Exception as exc:
            logger.warning("Redis DELETE failed for key=%s: %s", key, exc)
    _memory_cache.pop(key, None)


# ─── Session Store ────────────────────────────────────────────────────────────

SESSION_PREFIX = "session:"


async def session_get(session_id: str) -> Optional[dict]:
    return await cache_get(f"{SESSION_PREFIX}{session_id}")


async def session_set(session_id: str, data: dict) -> None:
    await cache_set(
        f"{SESSION_PREFIX}{session_id}",
        data,
        settings.session_ttl_seconds,
    )


async def session_delete(session_id: str) -> None:
    await cache_delete(f"{SESSION_PREFIX}{session_id}")


async def session_touch(session_id: str) -> None:
    """Reset TTL on existing session (sliding window)."""
    global _redis, _memory_cache
    key = f"{SESSION_PREFIX}{session_id}"
    if _redis is not None:
        try:
            await _redis.expire(key, settings.session_ttl_seconds)
            return
        except Exception as exc:
            logger.warning("Session touch failed: %s", exc)

    item = _memory_cache.get(key)
    if item is not None:
        val, _ = item
        _memory_cache[key] = (val, time.time() + settings.session_ttl_seconds)


# ─── Weather Cache ────────────────────────────────────────────────────────────

WEATHER_PREFIX = "weather:"
WARNING_PREFIX = "warning:"


async def weather_cache_get(location_key: str) -> Optional[dict]:
    return await cache_get(f"{WEATHER_PREFIX}{location_key}")


async def weather_cache_set(location_key: str, data: dict) -> None:
    await cache_set(
        f"{WEATHER_PREFIX}{location_key}",
        data,
        settings.weather_cache_ttl_seconds,
    )


async def warning_cache_get(location_key: str) -> Optional[list]:
    return await cache_get(f"{WARNING_PREFIX}{location_key}")


async def warning_cache_set(location_key: str, data: list) -> None:
    await cache_set(
        f"{WARNING_PREFIX}{location_key}",
        data,
        settings.warning_cache_ttl_seconds,
    )


# ─── Health Check ─────────────────────────────────────────────────────────────

async def redis_ping() -> bool:
    global _redis
    if _redis is not None:
        try:
            return bool(await _redis.ping())
        except Exception:
            return False
    return True  # memory fallback is active
