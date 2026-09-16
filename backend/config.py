"""
WeatherGPT v2.0 — Pydantic Settings with startup validation.
All optional integrations degrade gracefully — only GEMINI_API_KEY is truly required.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    # App identity
    app_version: str = "2.0.0"
    sih_problem_id: str = "SIH26068"
    environment: str = "development"

    # REQUIRED
    gemini_api_key: str

    # Databases
    postgres_url: str = "postgresql+asyncpg://weathergpt:weathergpt@localhost:5432/weathergpt"
    database_url: str = "postgresql+asyncpg://weathergpt:weathergpt@localhost:5432/weathergpt"
    mongodb_url: str = "mongodb://localhost:27017"
    redis_url: str = "redis://localhost:6379"

    # Google OAuth (optional — degrades to guest-only mode)
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/auth/callback"

    # JWT
    jwt_secret: str = "changeme-in-production-please-32chars"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 72

    # Bhashini (optional — degrades to Gemini NMT + gTTS)
    bhashini_user_id: str = ""
    bhashini_api_key: str = ""

    # Cache TTLs (seconds)
    session_ttl_seconds: int = 7200           # 2 hours sliding
    weather_cache_ttl_seconds: int = 1800     # 30 minutes
    warning_cache_ttl_seconds: int = 900      # 15 minutes

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Frontend URL (for OAuth redirect back)
    vite_api_base_url: str = "http://localhost:8000"

    @field_validator("gemini_api_key")
    @classmethod
    def require_gemini_key(cls, v: str) -> str:
        if not v or v.startswith("your_"):
            raise ValueError(
                "GEMINI_API_KEY is required. "
                "Get it from https://aistudio.google.com/ and add it to your .env file."
            )
        return v

    @property
    def google_oauth_available(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)

    @property
    def bhashini_available(self) -> bool:
        return bool(self.bhashini_user_id and self.bhashini_api_key)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
