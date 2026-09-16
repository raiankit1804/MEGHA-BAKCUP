"""
WeatherGPT v2.0 — IMD Live News & Press Release Ticker API
Fetches and caches real-time press releases and meteorological bulletins
directly from the official India Meteorological Department (IMD) Mausam portal.
"""

import logging
import time
import re
from typing import List, Dict
from urllib.parse import urljoin
import httpx
from fastapi import APIRouter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/imd", tags=["IMD News"])

FALLBACK_NEWS = [
    {
        "title": "प्रेस विज्ञप्ति तारीखः 14 सितंबर, 2026 19 सितंबर, 2026 के आसपास पश्चिमी राजस्थान के कुछ हिस्सों से दक्षिण-पश्चिम मॉनसून के लौटने के लिए हालात अनुकूल हो रहे हैं।",
        "url": "https://mausam.imd.gov.in/",
        "is_hindi": True,
    },
    {
        "title": "Press Release Dated: 14th September 2026: Conditions are becoming favourable for withdrawal of Southwest Monsoon from some parts of West Rajasthan around 19th September, 2026.",
        "url": "https://mausam.imd.gov.in/",
        "is_hindi": False,
    },
    {
        "title": "Current Weather Status and Extended Range Forecast for the next two weeks (10 to 23 September 2026)",
        "url": "https://mausam.imd.gov.in/",
        "is_hindi": False,
    },
    {
        "title": "डेटा आपूर्ति पोर्टल - मौसम संबंधी डेटा एपीआई और सोशल मीडिया के माध्यम से आईएमडी द्वारा दी गयी चेतावनीयां",
        "url": "https://mausam.imd.gov.in/",
        "is_hindi": True,
    },
]

_cached_news: List[Dict[str, str]] = list(FALLBACK_NEWS)
_cache_timestamp: float = 0
_is_refreshing: bool = False
CACHE_TTL = 600  # 10 minutes cache


async def _refresh_imd_news_background():
    global _cached_news, _cache_timestamp, _is_refreshing
    if _is_refreshing:
        return
    _is_refreshing = True

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://mausam.imd.gov.in/",
    }

    try:
        async with httpx.AsyncClient(timeout=12.0, verify=False) as client:
            resp = await client.get("https://mausam.imd.gov.in/", headers=headers)
            if resp.status_code == 200:
                html = resp.text
                marquees = re.findall(r"<marquee[^>]*>(.*?)</marquee>", html, re.DOTALL | re.IGNORECASE)
                parsed_items = []

                if marquees:
                    matches = re.findall(
                        r"<a\s+[^>]*href=[\'\"]([^\'\"]+)[\'\"][^>]*>(.*?)</a>",
                        marquees[0],
                        re.DOTALL | re.IGNORECASE,
                    )
                    for href, text in matches:
                        clean_text = re.sub(r"<[^>]+>", " ", text)
                        clean_text = re.sub(r"\s+", " ", clean_text).strip()
                        if len(clean_text) > 8:
                            full_url = urljoin("https://mausam.imd.gov.in/", href.strip())
                            is_hindi = any(ord(c) > 0x0900 and ord(c) < 0x097F for c in clean_text)
                            parsed_items.append({
                                "title": clean_text,
                                "url": full_url,
                                "is_hindi": is_hindi,
                            })

                if parsed_items:
                    _cached_news = parsed_items
                    _cache_timestamp = time.time()
                    logger.info("Successfully refreshed %d live IMD news items", len(_cached_news))
    except Exception as exc:
        logger.warning("Background IMD news refresh failed: %s", exc)
    finally:
        _is_refreshing = False


import asyncio

@router.get("/news")
async def get_imd_news():
    """
    Fetch live scrolling news and press releases from IMD Mausam portal.
    Always returns immediately (<5ms) from cache, while refreshing in background.
    """
    global _cached_news, _cache_timestamp

    now = time.time()
    if now - _cache_timestamp > CACHE_TTL:
        # Trigger non-blocking background refresh
        asyncio.create_task(_refresh_imd_news_background())

    return {
        "items": _cached_news,
        "count": len(_cached_news),
        "source": "live" if _cache_timestamp > 0 else "initial",
    }
