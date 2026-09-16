"""
WeatherGPT v2.0 — Response Synthesizer
Takes retrieved weather data + warnings + risk records → natural-language bilingual advisory.
Enforces structural separation: official warnings NEVER appear inside the AI advisory text.
Uses bilingual delimiter ===ENGLISH_VERSION=== for one-call dual-language output.
"""

import json
import logging
import re
from typing import Optional

from llm.gemini_client import get_model
from llm.prompts import get_synthesis_prompt, FOLLOWUP_CHIPS_PROMPT
from core.risk_engine import RiskRecord
from data.urban_flood_data import get_urban_flood_advisory

logger = logging.getLogger(__name__)

LANGUAGE_NAMES = {
    "en": "English", "hi": "Hindi", "ta": "Tamil", "te": "Telugu",
    "kn": "Kannada", "ml": "Malayalam", "bn": "Bengali", "gu": "Gujarati",
    "mr": "Marathi", "pa": "Punjabi", "or": "Odia", "as": "Assamese",
    "ur": "Urdu",
}

DISALLOWED_TOPICS = [
    "traffic jam", "traffic congestion", "live traffic", "flight", "plane", "airline",
    "airport delay", "train delay", "train cancel", "pnr", "bus schedule",
    "live camera", "cctv", "power cut", "electricity", "water cut"
]


def _build_weather_context(weather: dict, warnings: list[dict], risks: list[RiskRecord]) -> str:
    """Build the data block injected into the synthesis prompt."""
    current = weather.get("current_weather", {})
    daily = weather.get("daily_forecast", [])[:3]
    loc = weather.get("location_info", {})
    source = weather.get("source", "Open-Meteo")
    retrieved = weather.get("retrieved_at", "unknown")
    aqi = weather.get("air_quality")

    lines = [
        f"## RETRIEVED WEATHER DATA — {loc.get('name', 'India')}",
        f"Source: {source} | Retrieved: {retrieved}",
        f"Coordinates: {loc.get('latitude', 'N/A')}°N, {loc.get('longitude', 'N/A')}°E",
        f"State: {loc.get('admin1', 'N/A')}",
        "",
        "### Current Conditions",
        f"- Temperature: {current.get('temperature', 'N/A')}°C",
        f"- Feels Like: {current.get('feels_like', 'N/A')}°C",
        f"- Humidity: {current.get('humidity', 'N/A')}%",
        f"- Wind Speed: {current.get('wind_speed', 'N/A')} km/h",
        f"- Condition: {current.get('condition', 'N/A')} {current.get('emoji', '')}",
        f"- Precipitation: {current.get('precipitation', 0)} mm",
        f"- UV Index: {current.get('uv_index', 'N/A')} ({current.get('uv_category', 'N/A')})",
        f"- Visibility: {current.get('visibility', 'N/A')} km",
        f"- Cloud Cover: {current.get('cloud_cover', 'N/A')}%",
    ]

    if aqi:
        lines += [
            "",
            "### Air Quality",
            f"- US AQI: {aqi.get('us_aqi', 'N/A')} ({aqi.get('category', 'N/A')})",
            f"- PM2.5: {aqi.get('pm2_5', 'N/A')} µg/m³",
            f"- PM10: {aqi.get('pm10', 'N/A')} µg/m³",
        ]

    if daily:
        lines.append("\n### Next 3 Days Forecast")
        for d in daily:
            lines.append(
                f"- {d.get('date', 'N/A')}: {d.get('temp_min', 'N/A')}–{d.get('temp_max', 'N/A')}°C, "
                f"{d.get('condition', 'N/A')}, Rain: {d.get('precipitation_sum', 0)}mm "
                f"({d.get('precipitation_probability', 0)}% chance)"
            )

    if warnings:
        lines.append("\n### OFFICIAL IMD WARNINGS (for context only — display separately in UI)")
        for w in warnings:
            desc = w.get('description', '')
            hazard = w.get('hazard', 'Warning')
            lines.append(f"- {hazard}: {desc}")

    if risks:
        lines.append("\n### RISK ASSESSMENT (from deterministic rule engine — explain these, do not re-score)")
        for r in risks:
            lines.append(
                f"- {r.hazard}: {r.level} risk | {' | '.join(r.factors[:2])}"
            )

    # Urban Flood & Waterlogging Vulnerability Injection
    loc_full = f"{loc.get('name', '')} {loc.get('admin1', '')}".strip()
    precip = current.get("precipitation", 0.0) or 0.0
    cond = current.get("condition", "") or ""
    urban_adv = get_urban_flood_advisory(loc_full, rainfall_mm=precip, condition=cond)
    if urban_adv:
        lines.append(f"\n### URBAN INUNDATION & COMMUTE VULNERABILITY — {urban_adv['city']} (Source: {urban_adv['authority']})")
        lines.append(f"- Status: {urban_adv['risk_level']}")
        lines.append(f"- Known Waterlogging Hotspots: {', '.join(urban_adv['hotspots'][:6])}")
        lines.append(f"- Prone Underpasses to Avoid: {', '.join(urban_adv['underpasses_to_avoid'])}")
        lines.append(f"- Safe Transit Alternatives: {'; '.join(urban_adv['safe_alternatives'])}")
        lines.append(f"- Commuter Guidelines: {'; '.join(urban_adv['commute_guidelines'][:3])}")

    return "\n".join(lines)


def _split_bilingual(response_text: str) -> tuple[str, str]:
    """Split response on ===ENGLISH_VERSION=== delimiter."""
    delimiter = "===ENGLISH_VERSION==="
    if delimiter in response_text:
        parts = response_text.split(delimiter, 1)
        native = parts[0].strip()
        english = parts[1].strip()
        return native, english
    # Fallback: treat whole response as English if no delimiter found
    logger.warning("Bilingual delimiter not found in synthesis response — treating as English only")
    return response_text.strip(), response_text.strip()


async def synthesize_response(
    query: str,
    weather: dict,
    warnings: list[dict],
    risks: list[RiskRecord],
    domain_filter: str = "normal",
    target_language: str = "en",
    time_horizon: str = "current",
    turn_type: str = "establishing",
    conversation_history: Optional[list[dict]] = None,
) -> tuple[str, str]:
    """
    Generate a bilingual advisory response.
    Returns: (native_language_text, english_text)
    The LLM explains retrieved data — it does not invent any meteorological values.
    If turn_type == 'followup', produces a concise, targeted answer without repeating the full report.
    """
    lang_name = LANGUAGE_NAMES.get(target_language, "English")
    system_prompt = get_synthesis_prompt(domain_filter, lang_name, turn_type=turn_type)
    data_context = _build_weather_context(weather, warnings, risks)

    history_text = ""
    if conversation_history and turn_type == "followup":
        recent_turns = []
        for m in conversation_history[-4:]:
            role = m.get("role", "")
            text = m.get("variants", {}).get("en") or m.get("text_en") or m.get("query") or ""
            if text and role:
                clean_text = text[:300].strip()
                recent_turns.append(f"{role.capitalize()}: {clean_text}")
        if recent_turns:
            history_text = "### Recent Conversation Context:\n" + "\n".join(recent_turns) + "\n\n"

    if turn_type == "followup":
        task_instruction = f"""
This is a FOLLOW-UP turn in an ongoing conversation.
The user is asking: "{query}".
{history_text}
CRITICAL INSTRUCTIONS:
- Answer ONLY the specific question asked.
- DO NOT re-dump the full weather overview or repeat all Current Highlights, 3-day forecast table, or generic advice checklists.
- If asked about commute, flooded routes, or waterlogged underpasses, cite the Urban Inundation data provided. Give practical advice rather than refusing.
- Address only the specific metrics and implications directly relevant to the user's question.
- Keep the response direct, concise, and focused (around 2 to 4 clear sentences or brief targeted bullet points).
- Native language first, then ===ENGLISH_VERSION===, then English.
"""
    else:
        task_instruction = f"""
This is the ESTABLISHING turn for this conversation.
Write your advisory now using the Gemini structured bullet format. Remember: native language first, then ===ENGLISH_VERSION===, then English.
Organize into: 🌤️ Current Highlights, 🌧️ Rain & Forecast Outlook, 💡 Actionable Advice, and a single provenance footer line at the bottom.
Reference specific numbers from the data above.
"""

    full_prompt = f"""
User query: {query}
Time scope: {time_horizon}
Target language for native version: {lang_name} (ISO: {target_language})

{data_context}

{task_instruction}
"""

    model = get_model(system_instruction=system_prompt)

    try:
        response = model.generate_content(full_prompt)
        raw_text = response.text
        native, english = _split_bilingual(raw_text)

        # If target is English, both versions are the same
        if target_language == "en":
            english = native

        return native, english

    except Exception as exc:
        logger.error("Synthesis failed: %s", exc)
        current = weather.get("current_weather", {})
        loc = weather.get("location_info", {})
        loc_name = loc.get('name', 'your location')
        admin1 = loc.get('admin1', '')
        full_loc = f"{loc_name}, {admin1}" if admin1 else loc_name

        precip = current.get("precipitation", 0.0) or 0.0
        cond = current.get("condition", "") or ""
        urban_adv = get_urban_flood_advisory(full_loc, rainfall_mm=precip, condition=cond)
        query_commute = any(k in query.lower() for k in ["commute", "waterlog", "traffic", "flood", "road", "underpass", "jam", "travel", "avoid"])

        if turn_type == "followup":
            parts = [
                f"Regarding **'{query}'** in {full_loc}: Current temperature is {current.get('temperature', 'N/A')}°C "
                f"with {current.get('condition', 'typical seasonal conditions')}. "
                f"Measured precipitation is {precip} mm with {current.get('humidity', 'N/A')}% humidity."
            ]
            if urban_adv and (query_commute or precip > 0 or "rain" in cond.lower()):
                parts.append(
                    f"\n\n🚦 **Commute & Waterlogging Intelligence ({urban_adv['city']})**:\n"
                    f"- **Status**: {urban_adv['risk_level']} (via {urban_adv['authority']})\n"
                    f"- **Prone Hotspots**: {', '.join(urban_adv['hotspots'][:4])}\n"
                    f"- **Underpasses to Avoid**: {', '.join(urban_adv['underpasses_to_avoid'][:3])}\n"
                    f"- **Safe Transit Advice**: {urban_adv['safe_alternatives'][0]}. {urban_adv['commute_guidelines'][0]}"
                )
            fallback = "".join(parts)
        else:
            commute_section = ""
            if urban_adv:
                commute_section = (
                    f"\n\n🚗 **Urban Commute Advisory**: {urban_adv['risk_level']}. "
                    f"Watch for waterlogging at known vulnerable bottlenecks: {', '.join(urban_adv['hotspots'][:3])}. "
                    f"Exercise caution at {', '.join(urban_adv['underpasses_to_avoid'][:2])} during downpours."
                )
            fallback = (
                f"### 🌤️ Weather for {full_loc}\n"
                f"- **Temperature**: {current.get('temperature', 'N/A')}°C (Feels like {current.get('feels_like', 'N/A')}°C)\n"
                f"- **Condition**: {current.get('condition', 'N/A')}\n"
                f"- **Humidity**: {current.get('humidity', 'N/A')}% | **Wind**: {current.get('wind_speed', 'N/A')} km/h\n"
                f"- **Rainfall**: {precip} mm\n\n"
                f"💡 **Advisory**: Conditions are normal for the season. Keep an umbrella handy if showers are expected."
                f"{commute_section}"
            )
        return fallback, fallback


def _clean_chip(text: str) -> str:
    """Strip numbering, markdown bold/bullets, and excess quotes."""
    text = re.sub(r"^\s*[\d\.\-\*\•\>]+\s*", "", text)
    text = text.strip('"\'` \n\t')
    return text


def _filter_answerable_chips(
    chips: list[str],
    fallback_pool: list[str],
    max_count: int = 3,
) -> list[str]:
    """Filter out questions MEGHA SETU cannot answer and ensure clean, concise chips."""
    cleaned = []
    for c in chips:
        c_clean = _clean_chip(c)
        if not c_clean:
            continue
        c_lower = c_clean.lower()
        if any(bad in c_lower for bad in DISALLOWED_TOPICS):
            continue
        if len(c_clean.split()) > 12:
            continue
        if c_clean not in cleaned:
            cleaned.append(c_clean)
        if len(cleaned) == max_count:
            break

    # Top up with answerable fallbacks if any were rejected
    for fb in fallback_pool:
        if len(cleaned) >= max_count:
            break
        if fb not in cleaned:
            cleaned.append(fb)

    return cleaned[:max_count]


async def generate_followup_chips(
    advisory_text: str,
    location: str,
    domain_filter: str = "normal",
    target_language: str = "en",
) -> tuple[list[str], list[str]]:
    """
    Generate 3 domain-aware follow-up question chips that MEGHA SETU can answer.
    Returns: (native_followups, english_followups)
    """
    lang_name = LANGUAGE_NAMES.get(target_language, "English")
    prompt = FOLLOWUP_CHIPS_PROMPT.format(
        domain_filter=domain_filter, target_language=lang_name
    )
    full_prompt = f"""
Advisory context (location: {location}, domain: {domain_filter}):
{advisory_text[:500]}

{prompt}
"""
    generic_english = [
        f"Will it rain in {location} later today?",
        f"What is the forecast for tomorrow in {location}?",
        f"What is the current air quality (AQI) in {location}?",
    ]
    generic_native = [
        f"{location} में क्या आज बारिश होगी?",
        f"{location} में कल का मौसम कैसा रहेगा?",
        f"{location} में आज AQI कितना है?",
    ]

    model = get_model()
    try:
        response = model.generate_content(full_prompt)
        raw = response.text.strip()
        # Extract JSON
        json_match = re.search(r"\{.*\}", raw, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            raw_native = data.get("followups_native", [])
            raw_english = data.get("followups_english", [])

            filtered_english = _filter_answerable_chips(raw_english, generic_english)
            filtered_native = _filter_answerable_chips(
                raw_native,
                generic_english if target_language == "en" else generic_native,
            )
            return filtered_native, filtered_english
    except Exception as exc:
        logger.warning("Follow-up chip generation failed: %s", exc)

    return generic_native, generic_english
