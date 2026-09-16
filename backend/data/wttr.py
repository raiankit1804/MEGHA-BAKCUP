"""
WeatherGPT v2.0 — wttr.in Fallback Connector (Tier 3)
Used only when Open-Meteo returns HTTP 429 or is unreachable.
Always labeled source="wttr.in" in the response.
"""

import logging
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "WeatherGPT/2.0 SIH26068",
    "Accept": "application/json",
}


async def fetch_wttr(lat: float, lon: float) -> Optional[dict]:
    """
    Fetch current conditions and 7-day forecast from wttr.in.
    Returns raw JSON dict or None on failure.
    """
    url = f"https://wttr.in/{lat},{lon}?format=j1"
    async with httpx.AsyncClient(headers=HEADERS, timeout=10) as client:
        try:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
            logger.info("wttr.in Tier 3 fetch succeeded for (%s, %s)", lat, lon)
            return data
        except Exception as exc:
            logger.warning("wttr.in Tier 3 fetch failed: %s", exc)
            return None
