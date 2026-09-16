"""
WeatherGPT v2.0 — Translation, History, User, Voice, PDF API endpoints
"""

# ── translate.py ──────────────────────────────────────────────────────────────
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Translate"])

LANGUAGE_NAMES = {
    "en": "English", "hi": "Hindi", "ta": "Tamil", "te": "Telugu",
    "kn": "Kannada", "ml": "Malayalam", "bn": "Bengali", "gu": "Gujarati",
    "mr": "Marathi", "pa": "Punjabi", "or": "Odia", "as": "Assamese", "ur": "Urdu",
}


class TranslateRequest(BaseModel):
    text: str
    source_lang: str = "en"
    target_lang: str
    follow_up_questions: Optional[list[str]] = None


class TranslateResponse(BaseModel):
    translated_text: str
    target_lang: str
    source_lang: str
    translated_follow_ups: list[str] = []


@router.post("/translate", response_model=TranslateResponse)
async def translate(req: TranslateRequest):
    """
    On-demand translation — only called when a message is missing the requested language variant.
    Uses Bhashini if available, falls back to Gemini translation.
    """
    from services.bhashini import translate_text

    if req.source_lang == req.target_lang:
        return TranslateResponse(
            translated_text=req.text,
            target_lang=req.target_lang,
            source_lang=req.source_lang,
            translated_follow_ups=req.follow_up_questions or [],
        )

    try:
        translated = await translate_text(req.text, req.source_lang, req.target_lang, is_query=False)
        translated_chips = []
        if req.follow_up_questions:
            for q in req.follow_up_questions[:3]:
                # If q was already an essay or bad string, clean it
                clean_q = q.split('\n')[0].strip()
                if len(clean_q) > 80:
                    clean_q = clean_q[:75] + "?"
                tc = await translate_text(clean_q, req.source_lang, req.target_lang, is_query=True)
                clean_tc = tc.split('\n')[0].strip()
                if len(clean_tc) > 80:
                    clean_tc = clean_tc[:75] + "?"
                translated_chips.append(clean_tc)

        return TranslateResponse(
            translated_text=translated,
            target_lang=req.target_lang,
            source_lang=req.source_lang,
            translated_follow_ups=translated_chips,
        )
    except Exception as exc:
        logger.error("Translation failed: %s", exc)
        return TranslateResponse(
            translated_text=req.text,
            target_lang=req.target_lang,
            source_lang=req.source_lang,
            translated_follow_ups=req.follow_up_questions or [],
        )
