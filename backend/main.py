"""
WeatherGPT v2.0 — FastAPI Application Entry Point
Single /api prefix — no dual-mounting hacks.
Lifespan: verifies Gemini model, connects all databases, logs startup status.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from db.postgres import init_db
from db.mongo import connect_mongo, close_mongo
from db.redis_client import connect_redis, close_redis
from llm.gemini_client import verify_and_select_model

# ─── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO if settings.environment != "development" else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("weathergpt")


# ─── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info("WeatherGPT v%s — %s", settings.app_version, settings.sih_problem_id)
    logger.info("=" * 60)

    # 1. Gemini model verification
    logger.info("Verifying Gemini model ID via live API call...")
    try:
        model_id = await verify_and_select_model()
        logger.info("✅ Gemini model verified: %s", model_id)
    except Exception as exc:
        logger.warning("⚠️ Gemini live model verification skipped/failed (using candidate fallback): %s", exc)

    # 2. PostgreSQL
    logger.info("Initialising PostgreSQL tables...")
    await init_db()
    logger.info("✅ PostgreSQL ready")

    # 3. MongoDB
    logger.info("Connecting to MongoDB...")
    await connect_mongo()
    logger.info("✅ MongoDB ready")

    # 4. Redis
    logger.info("Connecting to Redis...")
    await connect_redis()
    logger.info("✅ Redis ready")

    logger.info("WeatherGPT startup complete — all systems ready")
    logger.info(
        "Google OAuth: %s | Bhashini: %s",
        "enabled" if settings.google_oauth_available else "disabled (stub mode)",
        "enabled" if settings.bhashini_available else "disabled (gTTS fallback)",
    )

    yield

    # Shutdown
    logger.info("WeatherGPT shutting down...")
    await close_mongo()
    await close_redis()


# ─── App Instance ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="MEGHA SETU",
    description="Multilingual conversational weather intelligence for India (SIH26068)",
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────

from api.chat import router as chat_router
from api.auth import router as auth_router
from api.translate import router as translate_router
from api.voice import router as voice_router
from api.history import router as history_router
from api.user import router as user_router
from api.pdf import router as pdf_router
from api.satellite import router as satellite_router
from api.news import router as news_router

app.include_router(chat_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(translate_router, prefix="/api")
app.include_router(voice_router, prefix="/api")
app.include_router(history_router, prefix="/api")
app.include_router(user_router, prefix="/api")
app.include_router(pdf_router, prefix="/api")
app.include_router(satellite_router, prefix="/api")
app.include_router(news_router, prefix="/api")

# ─── Health Probe ─────────────────────────────────────────────────────────────

@app.get("/health")
@app.get("/api/health")
async def health():
    from llm.gemini_client import get_verified_model_id
    from db.redis_client import redis_ping
    try:
        model_id = get_verified_model_id()
    except Exception:
        model_id = "not_verified"
    redis_ok = await redis_ping()
    return {
        "status": "ok",
        "version": settings.app_version,
        "sih_problem_id": settings.sih_problem_id,
        "verified_gemini_model": model_id,
        "google_oauth": settings.google_oauth_available,
        "bhashini": settings.bhashini_available,
        "redis": redis_ok,
    }


@app.get("/")
async def root():
    return {
        "name": "MEGHA SETU API",
        "version": settings.app_version,
        "problem_id": settings.sih_problem_id,
        "team": "Frame Fusion",
        "endpoints": {
            "chat": "POST /api/chat",
            "translate": "POST /api/translate",
            "auth": "GET /api/auth/google",
            "voice": "WS /api/ws/voice",
            "history": "GET /api/history",
            "user": "GET /api/user",
            "pdf": "POST /api/pdf",
            "health": "GET /health",
            "docs": "GET /docs",
        },
    }
