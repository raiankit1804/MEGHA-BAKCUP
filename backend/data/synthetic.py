"""
WeatherGPT v2.0 — Synthetic Indian Climatic Baseline Model (Tier 4 / Last Resort)
Used ONLY when all external APIs are unreachable.
Always flagged: type="synthetic", confidence="low".
NEVER presented as equivalent to live data.
"""

import math
from datetime import datetime, timezone


# ─── Indian Regional Climate Profiles ────────────────────────────────────────
# Monthly mean temperatures (°C) and rainfall probability (%) by broad climate zone.
# Based on IMD long-period averages (1991–2020 baseline).

CLIMATE_ZONES = {
    # zone_id: { "temp_mean": [jan..dec], "rain_prob": [jan..dec], "lat_range": (min, max) }
    "himalayan": {
        "lat_range": (28, 37), "lon_range": (73, 97),
        "temp_mean": [2, 4, 10, 15, 20, 22, 20, 19, 15, 10, 5, 2],
        "rain_prob": [20, 20, 15, 10, 15, 40, 60, 60, 40, 15, 10, 15],
    },
    "northern_plains": {
        "lat_range": (24, 32), "lon_range": (72, 88),
        "temp_mean": [14, 17, 23, 30, 36, 38, 34, 32, 30, 26, 20, 15],
        "rain_prob": [5, 5, 3, 2, 3, 25, 60, 65, 30, 5, 2, 3],
    },
    "rajasthan_arid": {
        "lat_range": (23, 30), "lon_range": (69, 77),
        "temp_mean": [16, 19, 25, 31, 37, 38, 35, 33, 32, 28, 22, 17],
        "rain_prob": [2, 2, 1, 1, 2, 10, 35, 40, 15, 2, 1, 1],
    },
    "deccan_plateau": {
        "lat_range": (14, 24), "lon_range": (74, 82),
        "temp_mean": [24, 26, 30, 33, 35, 31, 28, 27, 27, 28, 26, 23],
        "rain_prob": [5, 5, 5, 8, 10, 20, 50, 55, 45, 20, 10, 5],
    },
    "west_coast": {
        "lat_range": (8, 23), "lon_range": (72, 78),
        "temp_mean": [27, 28, 30, 32, 33, 29, 27, 27, 28, 29, 28, 27],
        "rain_prob": [5, 5, 5, 10, 25, 80, 90, 90, 75, 40, 15, 5],
    },
    "east_coast": {
        "lat_range": (8, 22), "lon_range": (78, 85),
        "temp_mean": [25, 27, 30, 33, 35, 32, 30, 30, 30, 28, 26, 25],
        "rain_prob": [10, 5, 5, 5, 15, 25, 30, 30, 40, 50, 35, 15],
    },
    "northeast": {
        "lat_range": (22, 29), "lon_range": (88, 97),
        "temp_mean": [16, 18, 22, 26, 28, 28, 28, 28, 27, 25, 20, 16],
        "rain_prob": [10, 15, 25, 40, 55, 75, 80, 80, 65, 35, 15, 10],
    },
}


def _get_zone(lat: float, lon: float) -> dict:
    """Return the best matching climate zone profile for given coordinates."""
    for zone_data in CLIMATE_ZONES.values():
        lat_min, lat_max = zone_data["lat_range"]
        lon_min, lon_max = zone_data["lon_range"]
        if lat_min <= lat <= lat_max and lon_min <= lon <= lon_max:
            return zone_data
    # Default to northern plains if no match
    return CLIMATE_ZONES["northern_plains"]


def _diurnal_adjustment(hour: int) -> float:
    """Temperature adjustment for time of day (diurnal cycle, ±5°C range)."""
    # Peak at ~14:00, minimum at ~05:00
    return 5.0 * math.sin(math.pi * (hour - 5) / 12) if 5 <= hour <= 17 else -2.5


def generate_synthetic_weather(lat: float, lon: float, location_name: str) -> dict:
    """
    Generate a deterministic synthetic weather baseline.
    Based on: latitude, longitude, month, and time of day.
    ALWAYS returns type="synthetic" and confidence="low".
    """
    now = datetime.now(timezone.utc)
    month_idx = now.month - 1  # 0-indexed
    hour = now.hour

    zone = _get_zone(lat, lon)
    base_temp = zone["temp_mean"][month_idx]
    rain_prob = zone["rain_prob"][month_idx]
    temp_with_diurnal = base_temp + _diurnal_adjustment(hour)

    # Humidity: inversely correlated with temperature in Indian climate
    humidity = max(30, min(95, int(100 - (base_temp - 15) * 1.5 + rain_prob * 0.3)))

    # Wind: slightly higher during monsoon, lower in winter
    wind_speed = 8 + rain_prob * 0.15

    # Weather code: best guess from rain probability
    if rain_prob > 70:
        weather_code = 63  # Moderate rain
        condition = "Moderate rain (seasonal estimate)"
    elif rain_prob > 40:
        weather_code = 80  # Slight showers
        condition = "Light showers likely (seasonal estimate)"
    elif rain_prob > 15:
        weather_code = 2   # Partly cloudy
        condition = "Partly cloudy (seasonal estimate)"
    else:
        weather_code = 0   # Clear sky
        condition = "Clear sky (seasonal estimate)"

    # 7-day daily forecast (deterministic variation)
    daily_forecast = []
    for d in range(7):
        variation = math.sin(d * 0.8) * 2  # ±2°C day-to-day variation
        daily_forecast.append({
            "date": f"Day {d + 1}",
            "temp_max": round(base_temp + 3 + variation, 1),
            "temp_min": round(base_temp - 4 + variation, 1),
            "precipitation_sum": round(rain_prob * 0.08 + variation * 0.3, 1),
            "precipitation_probability": int(rain_prob + variation * 5),
            "condition": condition,
            "emoji": "🌡️",
        })

    return {
        "location_info": {
            "name": location_name,
            "latitude": lat,
            "longitude": lon,
            "country": "India",
        },
        "current_weather": {
            "temperature": round(temp_with_diurnal, 1),
            "feels_like": round(temp_with_diurnal + (humidity - 60) * 0.05, 1),
            "humidity": humidity,
            "wind_speed": round(wind_speed, 1),
            "wind_direction": 180,  # generic southerly
            "precipitation": 0,
            "condition": condition,
            "emoji": "🌡️",
            "weather_code": weather_code,
            "uv_index": 6 if 9 <= hour <= 16 else 0,
            "uv_category": "High" if 9 <= hour <= 16 else "Low",
            "cloud_cover": int(rain_prob * 0.8),
            "visibility": 10.0,
        },
        "daily_forecast": daily_forecast,
        "hourly_forecast": [],
        "air_quality": None,
        "source": "Synthetic Indian Climatic Baseline",
        "type": "synthetic",
        "confidence": "low",
        "baseline_note": (
            "IMD 1991–2020 long-period average. "
            "Live APIs were unreachable at query time. "
            "This is a statistical estimate, not a live observation."
        ),
    }
