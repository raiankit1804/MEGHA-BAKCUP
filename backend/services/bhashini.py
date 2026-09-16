"""
WeatherGPT v2.0 — Bhashini ASR/NMT/TTS Service
Production: Bhashini API (MeitY) with 22 Official 8th Schedule Indian Languages.
Fallback chain: Gemini translation → gTTS (instant, text-cleaned).
2.5s fast-failover on Bhashini delays with circuit-breaker.
"""

import io
import re
import logging
import time
from typing import Optional
import httpx

from config import settings

logger = logging.getLogger(__name__)

# ─── Circuit breaker state ────────────────────────────────────────────────────
_bhashini_fail_time: float = 0
COOLDOWN_SECONDS = 60
FAST_TIMEOUT = 2.5  # Max 2.5s to prevent freezing UI

# All 22 Official 8th Schedule Indian Languages + English
SUPPORTED_LANGUAGES = {
    "en": "English", "hi": "Hindi", "bn": "Bengali", "te": "Telugu",
    "mr": "Marathi", "ta": "Tamil", "ur": "Urdu", "gu": "Gujarati",
    "kn": "Kannada", "ml": "Malayalam", "or": "Odia", "pa": "Punjabi",
    "as": "Assamese", "mai": "Maithili", "sat": "Santali", "ks": "Kashmiri",
    "ne": "Nepali", "kok": "Konkani", "sd": "Sindhi", "doi": "Dogri",
    "mni": "Manipuri", "brx": "Bodo", "sa": "Sanskrit",
}

BHASHINI_LANG_CODES = {
    "hi": "hi", "ta": "ta", "te": "te", "kn": "kn", "ml": "ml",
    "bn": "bn", "gu": "gu", "mr": "mr", "pa": "pa", "or": "or",
    "as": "as", "ur": "ur", "en": "en", "mai": "mai", "ne": "ne",
    "sa": "sa", "kok": "kok", "ks": "ks", "sd": "sd", "doi": "doi",
    "mni": "mni", "brx": "brx", "sat": "sat",
}


def _bhashini_available() -> bool:
    if not settings.bhashini_available:
        return False
    if time.time() - _bhashini_fail_time < COOLDOWN_SECONDS:
        logger.debug("Bhashini in cooldown — using fallback")
        return False
    return True


def _mark_bhashini_failure():
    global _bhashini_fail_time
    _bhashini_fail_time = time.time()


def _clean_text_for_tts(text: str, max_chars: int = 500) -> str:
    """
    Strip all emojis, markdown, and normalize weather units into spoken words.
    Produces natural, fluent speech in Hindi, Indian regional languages, or English.
    """
    if not text:
        return ""

    # 1. Remove all emojis and special pictographs
    emoji_regex = re.compile(
        r"[\U00010000-\U0010ffff\u2600-\u26ff\u2700-\u27bf\u2300-\u23ff\u2b50\u200d\ufe0f\u200b\u200c\u200e\u200f]",
        flags=re.UNICODE,
    )
    clean = emoji_regex.sub("", text)

    # 2. Strip URLs, English fallback footers, and citations
    clean = re.sub(r"https?://\S+", "", clean)
    clean = re.sub(r"===ENGLISH_VERSION===[\s\S]*", "", clean)
    clean = re.sub(r"Data source:.*$", "", clean, flags=re.IGNORECASE | re.MULTILINE)
    clean = re.sub(r"Sources:.*$", "", clean, flags=re.IGNORECASE | re.MULTILINE)

    # 3. Strip Markdown characters, bold, italics, headers, bullets
    clean = re.sub(r"[*#_\[\]`~>|]", " ", clean)
    clean = re.sub(r"^[•\-\*]\s*", "", clean, flags=re.MULTILINE)
    clean = re.sub(r"\n[•\-\*]\s*", ". ", clean)

    # 4. Spoken unit conversion (check if text is Devanagari or Indic)
    is_indic = any(ord(c) > 0x0900 for c in clean)

    if is_indic:
        clean = re.sub(r"°\s*C\b", " डिग्री सेल्सियस", clean)
        clean = re.sub(r"\bkm/h\b", " किलोमीटर प्रति घंटा", clean)
        clean = re.sub(r"%\b", " प्रतिशत", clean)
        clean = re.sub(r"\bmm\b", " मिलीमीटर", clean)
        clean = re.sub(r"\bhPa\b", " हेक्टोपास्कल", clean)
    else:
        clean = re.sub(r"°\s*C\b", " degrees Celsius", clean)
        clean = re.sub(r"\bkm/h\b", " kilometers per hour", clean)
        clean = re.sub(r"%\b", " percent", clean)
        clean = re.sub(r"\bmm\b", " millimeters", clean)
        clean = re.sub(r"\bhPa\b", " hectopascals", clean)

    # 5. Normalize whitespace and clean lines into spoken sentences
    clean = re.sub(r"\n+", ". ", clean)
    clean = re.sub(r"\s+", " ", clean).strip()

    # Extract sentences up to max_chars
    sentences = re.split(r"(?<=[.!?।])\s+", clean)
    collected = []
    total_len = 0
    for s in sentences:
        s = s.strip()
        if not s:
            continue
        if total_len + len(s) > max_chars and collected:
            break
        collected.append(s)
        total_len += len(s)

    result = " ".join(collected) if collected else clean
    return result[:max_chars].strip()


# ─── Speech to Text (ASR) ─────────────────────────────────────────────────────

async def speech_to_text(audio_bytes: bytes, language: str = "en") -> str:
    """ASR: audio bytes → transcript text."""
    if _bhashini_available() and language != "en":
        try:
            return await _bhashini_asr(audio_bytes, language)
        except Exception as exc:
            logger.warning("Bhashini ASR failed: %s — falling back to Gemini ASR", exc)
            _mark_bhashini_failure()

    return await _gemini_asr_fallback(audio_bytes, language)


async def _bhashini_asr(audio_bytes: bytes, language: str) -> str:
    import base64
    audio_b64 = base64.b64encode(audio_bytes).decode()
    payload = {
        "pipelineTasks": [{"taskType": "asr", "config": {"language": {"sourceLanguage": language}}}],
        "inputData": {"audio": [{"audioContent": audio_b64}]},
    }
    async with httpx.AsyncClient(timeout=FAST_TIMEOUT) as client:
        resp = await client.post(
            "https://dhruva-api.bhashini.gov.in/services/inference/pipeline",
            json=payload,
            headers={
                "userID": settings.bhashini_user_id,
                "ulcaApiKey": settings.bhashini_api_key,
                "Content-Type": "application/json",
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data["pipelineResponse"][0]["output"][0]["source"]


async def _gemini_asr_fallback(audio_bytes: bytes, language: str) -> str:
    """Gemini multimodal audio transcription fallback."""
    try:
        from google.genai import types
        from llm.gemini_client import get_client, get_verified_model_id
        client = get_client()
        model_id = get_verified_model_id()
        audio_part = types.Part.from_bytes(data=audio_bytes, mime_type="audio/wav")
        response = await client.aio.models.generate_content(
            model=model_id,
            contents=[f"Transcribe this audio accurately in Indian language: {SUPPORTED_LANGUAGES.get(language, 'English')}.", audio_part]
        )
        return response.text.strip() if response.text else ""
    except Exception as exc:
        logger.error("Gemini ASR fallback failed: %s", exc)
        return ""


# ─── Translation (NMT) ────────────────────────────────────────────────────────

async def translate_text(text: str, source_lang: str, target_lang: str, is_query: bool = False) -> str:
    """NMT: translate text between languages."""
    if source_lang == target_lang or not text:
        return text

    if _bhashini_available():
        try:
            return await _bhashini_nmt(text, source_lang, target_lang)
        except Exception as exc:
            logger.warning("Bhashini NMT failed (%s) — falling back to Gemini", exc)
            _mark_bhashini_failure()

    return await _gemini_translate_fallback(text, source_lang, target_lang, is_query=is_query)


async def _bhashini_nmt(text: str, source_lang: str, target_lang: str) -> str:
    payload = {
        "pipelineTasks": [{
            "taskType": "translation",
            "config": {"language": {"sourceLanguage": source_lang, "targetLanguage": target_lang}},
        }],
        "inputData": {"input": [{"source": text}]},
    }
    async with httpx.AsyncClient(timeout=FAST_TIMEOUT) as client:
        resp = await client.post(
            "https://dhruva-api.bhashini.gov.in/services/inference/pipeline",
            json=payload,
            headers={
                "userID": settings.bhashini_user_id,
                "ulcaApiKey": settings.bhashini_api_key,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data["pipelineResponse"][0]["output"][0]["target"]


async def _gemini_translate_fallback(text: str, source_lang: str, target_lang: str, is_query: bool = False) -> str:
    try:
        from llm.gemini_client import get_model
        lang_name = SUPPORTED_LANGUAGES.get(target_lang, target_lang)
        if is_query or len(text.split()) <= 15:
            system_instruction = (
                f"You are an expert translator. Translate the following short query or question directly into natural, conversational {lang_name}. "
                "Output ONLY the direct translated question (under 10 words). Do NOT answer the question. Do NOT include any introductory or explanatory text."
            )
        else:
            system_instruction = (
                f"You are an expert translator. Translate the weather report into natural, conversational {lang_name}. "
                "Maintain bullet points and exact meteorological metrics (temperatures, wind speeds, rainfall in mm). Output ONLY the translated text without conversational preamble or meta-commentary."
            )
        model = get_model(system_instruction=system_instruction)
        response = await model.generate_content_async(text)
        result = response.text.strip() if response.text else text

        # Strip any meta-commentary or conversational preambles
        result = re.sub(r"^(?:Here is the translation[^\n:]*[:\n]+|Here's the translation[^\n:]*[:\n]+|Sure,[^\n:]*[:\n]+|Certainly,[^\n:]*[:\n]+)", "", result, flags=re.IGNORECASE).strip()
        result = result.strip('"\'')
        return result or text
    except Exception as exc:
        logger.error("Gemini translate fallback failed: %s", exc)
        return text


# ─── Text to Speech (TTS) ─────────────────────────────────────────────────────

_tts_cache: dict[tuple, bytes] = {}
MAX_TTS_CACHE = 50


async def text_to_speech(text: str, language: str = "en") -> bytes:
    """TTS: text → mp3 audio bytes."""
    clean_text = _clean_text_for_tts(text)
    cache_key = (hash(clean_text), language)

    if cache_key in _tts_cache:
        return _tts_cache[cache_key]

    audio_bytes = None

    if _bhashini_available() and language != "en":
        try:
            audio_bytes = await _bhashini_tts(clean_text, language)
        except Exception as exc:
            logger.warning("Bhashini TTS failed (%s) — fast failover to gTTS", exc)
            _mark_bhashini_failure()

    if not audio_bytes:
        audio_bytes = await _gtts_fallback(clean_text, language)

    # Cache it
    if audio_bytes:
        if len(_tts_cache) >= MAX_TTS_CACHE:
            oldest = next(iter(_tts_cache))
            del _tts_cache[oldest]
        _tts_cache[cache_key] = audio_bytes

    return audio_bytes or b""


async def _bhashini_tts(text: str, language: str) -> bytes:
    payload = {
        "pipelineTasks": [{"taskType": "tts", "config": {"language": {"sourceLanguage": language}}}],
        "inputData": {"input": [{"source": text}]},
    }
    async with httpx.AsyncClient(timeout=FAST_TIMEOUT) as client:
        resp = await client.post(
            "https://dhruva-api.bhashini.gov.in/services/inference/pipeline",
            json=payload,
            headers={
                "userID": settings.bhashini_user_id,
                "ulcaApiKey": settings.bhashini_api_key,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        import base64
        audio_b64 = data["pipelineResponse"][0]["audio"][0]["audioContent"]
        return base64.b64decode(audio_b64)


async def _gtts_fallback(text: str, language: str) -> bytes:
    """gTTS fast-path fallback — instant audio synthesis."""
    try:
        from gtts import gTTS
        # gTTS supported Indian language codes
        gtts_map = {
            "hi": "hi", "ta": "ta", "te": "te", "kn": "kn", "ml": "ml",
            "bn": "bn", "gu": "gu", "mr": "mr", "pa": "pa", "ur": "ur",
            "ne": "ne", "en": "en"
        }
        gtts_lang = gtts_map.get(language, "hi" if language != "en" else "en")
        tts = gTTS(text=text, lang=gtts_lang, slow=False)
        buf = io.BytesIO()
        tts.write_to_fp(buf)
        buf.seek(0)
        return buf.read()
    except Exception as exc:
        logger.error("gTTS fallback failed: %s", exc)
        return b""
