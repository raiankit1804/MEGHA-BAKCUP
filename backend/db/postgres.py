"""
WeatherGPT v2.0 — PostgreSQL Models & Database Layer
Stores: meteorological records, warnings (with audit history), alert delivery logs.
MongoDB handles user/profile/chat data — see mongo.py.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Float, DateTime, Enum, Text, Boolean, Integer,
    ForeignKey, Index, func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
import enum

from config import settings


# ─── Engine & Session Factory ─────────────────────────────────────────────────

import logging
logger = logging.getLogger(__name__)

engine = None
AsyncSessionFactory = None

def _create_engine_and_factory(url: str):
    global engine, AsyncSessionFactory
    is_sqlite = "sqlite" in url
    kwargs = {"echo": settings.environment == "development"}
    if not is_sqlite:
        kwargs["pool_size"] = 10
        kwargs["max_overflow"] = 20
    engine = create_async_engine(url, **kwargs)
    AsyncSessionFactory = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

# Initial try with configured URL
_create_engine_and_factory(settings.database_url)


async def get_db() -> AsyncSession:
    """FastAPI dependency — yields a database session."""
    global AsyncSessionFactory
    async with AsyncSessionFactory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Create all tables on startup (idempotent, with SQLite fallback)."""
    global engine
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("✅ Database initialized successfully: %s", settings.database_url)
    except Exception as exc:
        logger.warning("⚠️ PostgreSQL connection failed (%s). Falling back to local SQLite database (weathergpt.db).", exc)
        _create_engine_and_factory("sqlite+aiosqlite:///./weathergpt.db")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("✅ SQLite fallback database initialized successfully.")


# ─── Base ────────────────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    pass


# ─── Enums ───────────────────────────────────────────────────────────────────

class DataType(str, enum.Enum):
    observation = "observation"
    forecast = "forecast"
    warning = "warning"
    model_guidance = "model_guidance"
    synthetic = "synthetic"


class ConfidenceLevel(str, enum.Enum):
    high = "high"
    moderate = "moderate"
    low = "low"


class ModelAgreement(str, enum.Enum):
    high = "high"
    moderate = "moderate"
    low = "low"
    not_applicable = "not_applicable"


class WarningSeverity(str, enum.Enum):
    red = "red"
    orange = "orange"
    yellow = "yellow"
    green = "green"
    none = "none"


class AlertChannel(str, enum.Enum):
    web_push = "web_push"
    in_app = "in_app"
    sms = "sms"


# ─── WeatherRecord ────────────────────────────────────────────────────────────

class WeatherRecord(Base):
    """
    Normalised meteorological observation or forecast point.
    Every record must carry source and retrieved_at — no anonymous data.
    """
    __tablename__ = "weather_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # Location
    location_name: Mapped[str] = mapped_column(String(200))
    district: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    country: Mapped[str] = mapped_column(String(100), default="India")
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    # Data
    metric: Mapped[str] = mapped_column(String(100))        # e.g. "temperature", "rainfall"
    value: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(20))            # e.g. "C", "mm", "km/h"
    valid_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    # Provenance
    source: Mapped[str] = mapped_column(String(100))         # "IMD", "Open-Meteo", "wttr.in", "synthetic"
    data_type: Mapped[DataType] = mapped_column(Enum(DataType))
    model_agreement: Mapped[ModelAgreement] = mapped_column(
        Enum(ModelAgreement), default=ModelAgreement.not_applicable
    )
    confidence: Mapped[ConfidenceLevel] = mapped_column(
        Enum(ConfidenceLevel), default=ConfidenceLevel.high
    )
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_weather_location_metric_time", "location_name", "metric", "valid_time"),
        Index("ix_weather_source", "source"),
    )


# ─── WarningRecord ───────────────────────────────────────────────────────────

class WarningRecord(Base):
    """
    Official IMD warning — stored with full audit history.
    CRITICAL: Never mix with AI risk assessments in this table.
    AI risk assessments are computed at runtime and never stored here.
    """
    __tablename__ = "warning_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # Identity
    external_id: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)  # IMD bulletin ID if available
    hazard: Mapped[str] = mapped_column(String(200))       # e.g. "Heavy Rain", "Cyclone", "Heatwave"
    # Location
    location_name: Mapped[str] = mapped_column(String(300))
    district: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    # Warning details
    severity: Mapped[WarningSeverity] = mapped_column(Enum(WarningSeverity))
    description: Mapped[str] = mapped_column(Text)
    valid_from: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    valid_to: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    # Provenance — source is ALWAYS "IMD" for this table
    source: Mapped[str] = mapped_column(String(100), default="IMD")
    issued_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Audit trail — child records track changes
    audit_logs: Mapped[list["WarningAuditLog"]] = relationship(
        back_populates="warning", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_warning_location_active", "location_name", "is_active"),
        Index("ix_warning_severity", "severity"),
        Index("ix_warning_retrieved", "retrieved_at"),
    )


class WarningAuditLog(Base):
    """Immutable audit trail for warning record changes."""
    __tablename__ = "warning_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    warning_id: Mapped[int] = mapped_column(ForeignKey("warning_records.id"))
    change_type: Mapped[str] = mapped_column(String(50))   # "created", "updated", "deactivated"
    previous_severity: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    new_severity: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    warning: Mapped["WarningRecord"] = relationship(back_populates="audit_logs")


# ─── AlertDeliveryLog ────────────────────────────────────────────────────────

class AlertDeliveryLog(Base):
    """Tracks every proactive alert sent to a user."""
    __tablename__ = "alert_delivery_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)  # MongoDB user _id
    warning_id: Mapped[Optional[int]] = mapped_column(ForeignKey("warning_records.id"), nullable=True)
    channel: Mapped[AlertChannel] = mapped_column(Enum(AlertChannel))
    delivered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


# ─── HistoricalClimateRecord ─────────────────────────────────────────────────

class HistoricalClimateRecord(Base):
    """
    Long-term climate data for trend/anomaly queries (Study/Research domain).
    Baseline period is always stored and surfaced in answers — never hidden.
    """
    __tablename__ = "historical_climate_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    location_name: Mapped[str] = mapped_column(String(200))
    state: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    metric: Mapped[str] = mapped_column(String(100))
    value: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(20))
    year: Mapped[int] = mapped_column(Integer)
    month: Mapped[int] = mapped_column(Integer)
    # Baseline metadata — always shown in research mode
    baseline_period_start: Mapped[int] = mapped_column(Integer)   # e.g. 1991
    baseline_period_end: Mapped[int] = mapped_column(Integer)     # e.g. 2020
    anomaly: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # deviation from baseline
    source: Mapped[str] = mapped_column(String(100))

    __table_args__ = (
        Index("ix_climate_location_metric_year", "location_name", "metric", "year"),
    )
