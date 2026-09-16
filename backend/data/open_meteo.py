"""
WeatherGPT v2.0 — Open-Meteo Data Connector
Tier 1: Open-Meteo forecast (India-optimized, IMD-aligned)
Tier 2: Open-Meteo GFS NWP model (clearly labeled as model guidance)

On HTTP 429 or any exception: caller should chain to wttr.py (Tier 3).
Never retry in a loop — fail fast, hand off to the next tier.
"""

import logging
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

BASE_URL = "https://api.open-meteo.com/v1"
GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
REVERSE_GEO_URL = "https://nominatim.openstreetmap.org/reverse"

HEADERS = {
    "User-Agent": "WeatherGPT/2.0 SIH26068 (contact: framefusion@sih.gov.in)",
    "Accept": "application/json",
}

# Standard variables requested from Open-Meteo for India
CURRENT_VARS = [
    "temperature_2m", "apparent_temperature", "relative_humidity_2m",
    "wind_speed_10m", "wind_direction_10m", "precipitation",
    "surface_pressure", "weather_code", "cloud_cover",
    "uv_index", "visibility",
]

DAILY_VARS = [
    "temperature_2m_max", "temperature_2m_min", "precipitation_sum",
    "precipitation_probability_max", "wind_speed_10m_max", "wind_gusts_10m_max",
    "weather_code", "sunrise", "sunset", "uv_index_max",
]

HOURLY_VARS = [
    "temperature_2m", "precipitation", "precipitation_probability",
    "wind_speed_10m", "weather_code",
]

AQI_VARS = ["pm2_5", "pm10", "ozone", "nitrogen_dioxide", "us_aqi"]


def is_in_india(lat: float, lon: float) -> bool:
    """Check whether coordinates fall within the geographical boundary of India."""
    return 6.0 <= lat <= 37.5 and 68.0 <= lon <= 97.5


async def geocode_location(name: str) -> Optional[dict]:
    """Resolve a place name (city, town, or neighborhood) to lat/lon + admin metadata."""
    clean_name = name.strip()
    # 1. Try Open-Meteo Geocoding
    async with httpx.AsyncClient(headers=HEADERS, timeout=8) as client:
        try:
            resp = await client.get(
                GEOCODE_URL,
                params={"name": clean_name, "count": 10, "language": "en", "format": "json"},
            )
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                indian = [r for r in results if r.get("country_code") == "IN" or is_in_india(r.get("latitude", 0), r.get("longitude", 0))]
                if indian:
                    best = indian[0]
                    state = best.get("admin1")
                    city_name = best.get("name", clean_name)
                    display = f"{city_name}, {state}" if (state and state.lower() not in city_name.lower()) else city_name
                    return {
                        "name": display,
                        "raw_name": city_name,
                        "latitude": best["latitude"],
                        "longitude": best["longitude"],
                        "admin1": state,
                        "admin2": best.get("admin2"),
                        "country_code": "IN",
                    }
        except Exception as exc:
            logger.debug("Open-Meteo geocoding missed for '%s': %s", clean_name, exc)

        # 2. Fallback to OpenStreetMap Nominatim for exact Indian localities (suburbs, wards, villages)
        try:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": clean_name, "format": "json", "addressdetails": 1, "countrycodes": "in", "limit": 1},
            )
            if resp.status_code == 200:
                results = resp.json()
                if results:
                    best = results[0]
                    addr = best.get("address", {})
                    suburb = addr.get("suburb") or addr.get("neighbourhood") or addr.get("residential")
                    city = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("county")
                    state = addr.get("state")
                    place_name = suburb or city or clean_name
                    display = f"{place_name}, {state}" if (state and state.lower() not in place_name.lower()) else place_name
                    return {
                        "name": display,
                        "raw_name": place_name,
                        "latitude": float(best["lat"]),
                        "longitude": float(best["lon"]),
                        "admin1": state,
                        "admin2": addr.get("county") or city,
                        "country_code": "IN",
                    }
        except Exception as exc:
            logger.warning("Nominatim geocoding failed for '%s': %s", clean_name, exc)

    return None


async def reverse_geocode(lat: float, lon: float) -> Optional[dict]:
    """Convert GPS coordinates to city/state name."""
    # Guard: if coordinates are clearly outside India, fall back to Bengaluru, Karnataka
    if not is_in_india(lat, lon):
        logger.warning("Reverse geocode coordinates (%s, %s) outside India — defaulting to Bengaluru", lat, lon)
        return {
            "name": "Bengaluru",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "admin1": "Karnataka",
            "country_code": "IN",
            "is_fallback": True,
        }

    async with httpx.AsyncClient(headers=HEADERS, timeout=8) as client:
        try:
            resp = await client.get(
                REVERSE_GEO_URL,
                params={"lat": lat, "lon": lon, "format": "json", "zoom": 16},
            )
            resp.raise_for_status()
            data = resp.json()
            address = data.get("address", {})
            locality = (
                address.get("suburb")
                or address.get("neighbourhood")
                or address.get("residential")
                or address.get("quarter")
                or address.get("subdistrict")
                or address.get("city_district")
                or address.get("hamlet")
            )
            city = (
                address.get("city")
                or address.get("town")
                or address.get("village")
                or address.get("municipality")
                or address.get("county")
                or "Unknown location"
            )
            country = address.get("country_code", "").upper()
            if country and country != "IN":
                logger.warning("Reverse geocode country '%s' is not India — defaulting to Bengaluru", country)
                return {
                    "name": "Bengaluru",
                    "latitude": 12.9716,
                    "longitude": 77.5946,
                    "admin1": "Karnataka",
                    "country_code": "IN",
                    "is_fallback": True,
                }

            if locality and city and locality.lower() != city.lower():
                display_name = f"{locality}, {city}"
            elif locality:
                display_name = locality
            else:
                display_name = city

            return {
                "name": display_name,
                "locality": locality,
                "city": city,
                "latitude": lat,
                "longitude": lon,
                "admin1": address.get("state"),
                "country_code": country or "IN",
            }
        except Exception as exc:
            logger.warning("Reverse geocode failed for (%s, %s): %s", lat, lon, exc)
            return None


async def _fetch_forecast(lat: float, lon: float, model: Optional[str] = None) -> dict:
    """
    Core Open-Meteo forecast fetch.
    model=None → default (India-optimized, Tier 1)
    model="gfs_global" → GFS NWP (Tier 2 model guidance)
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": ",".join(CURRENT_VARS),
        "daily": ",".join(DAILY_VARS),
        "hourly": ",".join(HOURLY_VARS),
        "timezone": "Asia/Kolkata",
        "forecast_days": 7,
    }
    if model:
        params["models"] = model

    async with httpx.AsyncClient(headers=HEADERS, timeout=15) as client:
        resp = await client.get(f"{BASE_URL}/forecast", params=params)
        if resp.status_code == 429:
            raise RateLimitError("Open-Meteo rate limit hit")
        resp.raise_for_status()
        return resp.json()


async def _fetch_air_quality(lat: float, lon: float) -> Optional[dict]:
    """Fetch AQI data (best-effort — not required for fallback chain)."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": ",".join(AQI_VARS),
        "timezone": "Asia/Kolkata",
    }
    async with httpx.AsyncClient(headers=HEADERS, timeout=8) as client:
        try:
            resp = await client.get(AIR_QUALITY_URL, params=params)
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:
            logger.debug("AQI fetch failed (non-critical): %s", exc)
            return None


async def fetch_tier1(lat: float, lon: float, location_info: dict) -> dict:
    """
    Tier 1: Open-Meteo default model (IMD-aligned for India).
    Raises RateLimitError or httpx.HTTPError on failure — let caller chain to Tier 2/3.
    """
    raw = await _fetch_forecast(lat, lon, model=None)
    aqi_raw = await _fetch_air_quality(lat, lon)
    raw["location_info"] = location_info
    if aqi_raw:
        raw["air_quality"] = aqi_raw
    return raw


async def fetch_tier2_nwp(lat: float, lon: float, location_info: dict) -> Optional[dict]:
    """
    Tier 2: GFS NWP model guidance (secondary source, clearly labeled).
    Returns None on any failure — this is non-critical.
    """
    try:
        raw = await _fetch_forecast(lat, lon, model="gfs_global")
        raw["location_info"] = location_info
        return raw
    except Exception as exc:
        logger.info("Tier 2 NWP fetch failed (non-critical): %s", exc)
        return None


class RateLimitError(Exception):
    pass
