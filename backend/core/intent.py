"""
WeatherGPT v2.0 — Intent Extraction
Uses Gemini function calling to parse user queries into structured QueryContext.
Includes a pre-LLM fast-path geocoder for common Indian cities (zero latency)
and robust domain heuristic fallback.
"""

import json
import logging
import re
from typing import Optional

from llm.gemini_client import get_client, get_verified_model_id, get_client as _get_client
from llm.prompts import INTENT_EXTRACTION_PROMPT
from google.genai import types

logger = logging.getLogger(__name__)


# ─── Pre-LLM Fast-Path Geocoder ───────────────────────────────────────────────
# Sorted by length (longest first) to match compound names before simpler ones.

INDIAN_CITY_COORDS: dict[str, tuple[float, float, str]] = {
    # (latitude, longitude, state)
    "greater noida": (28.4744, 77.5040, "Uttar Pradesh"),
    "navi mumbai": (19.0330, 73.0297, "Maharashtra"),
    "visakhapatnam": (17.6868, 83.2185, "Andhra Pradesh"),
    "thiruvananthapuram": (8.5241, 76.9366, "Kerala"),
    "vishakhapatnam": (17.6868, 83.2185, "Andhra Pradesh"),
    "vishakha": (17.6868, 83.2185, "Andhra Pradesh"),
    "coimbatore": (11.0168, 76.9558, "Tamil Nadu"),
    "chandigarh": (30.7333, 76.7794, "Punjab"),
    "ahmedabad": (23.0225, 72.5714, "Gujarat"),
    "hyderabad": (17.3850, 78.4867, "Telangana"),
    "bangalore": (12.9716, 77.5946, "Karnataka"),
    "bengaluru": (12.9716, 77.5946, "Karnataka"),
    "kolkata": (22.5726, 88.3639, "West Bengal"),
    "calcutta": (22.5726, 88.3639, "West Bengal"),
    "chennai": (13.0827, 80.2707, "Tamil Nadu"),
    "madras": (13.0827, 80.2707, "Tamil Nadu"),
    "mumbai": (19.0760, 72.8777, "Maharashtra"),
    "bombay": (19.0760, 72.8777, "Maharashtra"),
    "delhi": (28.6139, 77.2090, "Delhi"),
    "new delhi": (28.6139, 77.2090, "Delhi"),
    "jaipur": (26.9124, 75.7873, "Rajasthan"),
    "lucknow": (26.8467, 80.9462, "Uttar Pradesh"),
    "patna": (25.5941, 85.1376, "Bihar"),
    "bhopal": (23.2599, 77.4126, "Madhya Pradesh"),
    "indore": (22.7196, 75.8577, "Madhya Pradesh"),
    "nagpur": (21.1458, 79.0882, "Maharashtra"),
    "pune": (18.5204, 73.8567, "Maharashtra"),
    "surat": (21.1702, 72.8311, "Gujarat"),
    "kochi": (9.9312, 76.2673, "Kerala"),
    "cochin": (9.9312, 76.2673, "Kerala"),
    "bhubaneswar": (20.2961, 85.8245, "Odisha"),
    "guwahati": (26.1445, 91.7362, "Assam"),
    "ranchi": (23.3441, 85.3096, "Jharkhand"),
    "amritsar": (31.6340, 74.8723, "Punjab"),
    "jodhpur": (26.2389, 73.0243, "Rajasthan"),
    "agra": (27.1767, 78.0081, "Uttar Pradesh"),
    "varanasi": (25.3176, 82.9739, "Uttar Pradesh"),
    "srinagar": (34.0837, 74.7973, "Jammu & Kashmir"),
    "shimla": (31.1048, 77.1734, "Himachal Pradesh"),
    "dehradun": (30.3165, 78.0322, "Uttarakhand"),
    "raipur": (21.2514, 81.6296, "Chhattisgarh"),
    "vijaywada": (16.5062, 80.6480, "Andhra Pradesh"),
    "vijayawada": (16.5062, 80.6480, "Andhra Pradesh"),
    "madurai": (9.9252, 78.1198, "Tamil Nadu"),
    "mangalore": (12.8698, 74.8430, "Karnataka"),
    "mysore": (12.2958, 76.6394, "Karnataka"),
    "mysuru": (12.2958, 76.6394, "Karnataka"),
    "leh": (34.1526, 77.5771, "Ladakh"),
    "gangtok": (27.3314, 88.6138, "Sikkim"),
    "imphal": (24.8170, 93.9368, "Manipur"),
    "shillong": (25.5788, 91.8933, "Meghalaya"),
    "aizawl": (23.7307, 92.7173, "Mizoram"),
    "itanagar": (27.0844, 93.6053, "Arunachal Pradesh"),
    "kohima": (25.6701, 94.1077, "Nagaland"),
    "ludhiana": (30.9010, 75.8573, "Punjab"),
    "meerut": (28.9845, 77.7064, "Uttar Pradesh"),
    "odisha": (20.9517, 85.0985, "Odisha"),
    "india": (20.5937, 78.9629, "India"),
    # Indic transliterations
    "बेंगलुरु": (12.9716, 77.5946, "Karnataka"),
    "चेन्नई": (13.0827, 80.2707, "Tamil Nadu"),
    "சென்னையில்": (13.0827, 80.2707, "Tamil Nadu"),
    "சென்னை": (13.0827, 80.2707, "Tamil Nadu"),
    "कोलकाता": (22.5726, 88.3639, "West Bengal"),
    "কলকাতায়": (22.5726, 88.3639, "West Bengal"),
    "কলকাতা": (22.5726, 88.3639, "West Bengal"),
    "जयपुर": (26.9124, 75.7873, "Rajasthan"),
    "கொச்சி": (9.9312, 76.2673, "Kerala"),
    "കൊച്ചി": (9.9312, 76.2673, "Kerala"),
    "హైదరాబాద్‌లో": (17.3850, 78.4867, "Telangana"),
    "హైదరాబాద్": (17.3850, 78.4867, "Telangana"),
    "वाराणसी": (25.3176, 82.9739, "Uttar Pradesh"),
    "अमृतसर": (31.6340, 74.8723, "Punjab"),
    "लखनऊ": (26.8467, 80.9462, "Uttar Pradesh"),
    "दिल्ली": (28.6139, 77.2090, "Delhi"),
    "मुंबई": (19.0760, 72.8777, "Maharashtra"),
}

_SORTED_CITIES = sorted(INDIAN_CITY_COORDS.keys(), key=len, reverse=True)


def fast_geocode(text: str) -> Optional[tuple[str, float, float, str]]:
    """
    Zero-latency city detection from text using the dictionary above.
    Returns (city_name, lat, lon, state) or None if no match.
    Sorted by name length — longer names matched first to avoid false positives.
    """
    text_lower = text.lower()
    for city in _SORTED_CITIES:
        if city in text_lower:
            lat, lon, state = INDIAN_CITY_COORDS[city]
            # Standardize city display name
            display_name = city.title()
            if city in ["बेंगलुरु"]: display_name = "Bengaluru"
            elif city in ["சென்னையில்", "சென்னை", "चेन्नई"]: display_name = "Chennai"
            elif city in ["কলকাতায়", "কলকাতা", "कोलकाता"]: display_name = "Kolkata"
            elif city in ["கொச்சி", "കൊച്ചി"]: display_name = "Kochi"
            elif city in ["హైదరాబాద్‌లో", "హైదరాబాద్"]: display_name = "Hyderabad"
            elif city in ["जयपुर"]: display_name = "Jaipur"
            elif city in ["वाराणसी"]: display_name = "Varanasi"
            elif city in ["अमृतसर"]: display_name = "Amritsar"
            elif city in ["लखनऊ"]: display_name = "Lucknow"
            elif city in ["दिल्ली"]: display_name = "Delhi"
            elif city in ["मुंबई"]: display_name = "Mumbai"
            return display_name, lat, lon, state
    return None


def detect_script(text: str) -> Optional[str]:
    """Detect Indian language script from Unicode ranges."""
    if re.search(r"[\u0900-\u097F]", text): return "hi"
    if re.search(r"[\u0980-\u09FF]", text): return "bn"
    if re.search(r"[\u0A00-\u0A7F]", text): return "pa"
    if re.search(r"[\u0A80-\u0AFF]", text): return "gu"
    if re.search(r"[\u0B00-\u0B7F]", text): return "or"
    if re.search(r"[\u0B80-\u0BFF]", text): return "ta"
    if re.search(r"[\u0C00-\u0C7F]", text): return "te"
    if re.search(r"[\u0C80-\u0CFF]", text): return "kn"
    if re.search(r"[\u0D00-\u0D7F]", text): return "ml"
    if re.search(r"[\u0600-\u06FF]", text): return "ur"
    return None


def heuristic_intent(query: str, domain_filter: str = "normal") -> dict:
    """Heuristic fallback when LLM is unavailable or offline."""
    q = query.lower()
    intent = "urban_general"
    time_horizon = "current"

    if any(w in q for w in ["tomorrow", "कल", "কাল", "நாளை", "రేపు"]):
        time_horizon = "tomorrow"
    elif any(w in q for w in ["today", "आज", "আজ", "இன்று", "ఈరోజు", "afternoon"]):
        time_horizon = "today"
    elif any(w in q for w in ["next 3 days", "3 days", "अगले 3 दिन"]):
        time_horizon = "next_3_days"
    elif any(w in q for w in ["next 7 days", "7 days", "week", "weekly", "सप्ताह"]):
        time_horizon = "weekly"
    elif any(w in q for w in ["baseline", "anomaly", "trend", "decadal", "historical", "1980", "1991", "average"]):
        time_horizon = "historical"
        intent = "climate_research"

    if any(w in q for w in ["cyclone", "heatwave", "severe rain", "warning", "alert", "flood"]):
        intent = "disaster_warning"
    elif any(w in q for w in ["pesticide", "crop", "wheat", "cotton", "soil", "irrigation", "paddy", "harvest", "sugarcane", "बुवाई", "बाजरे", "फसल", "कृषि", "spray"]):
        intent = "agriculture"
    elif any(w in q for w in ["crosswind", "runway", "visibility", "ceiling", "turbulence", "flight", "pilot", "aviation", "fog"]):
        intent = "aviation"
    elif any(w in q for w in ["sea state", "wave", "wave height", "fishermen", "marine", "high tide", "tide", "coast", "मत्स्य", "മത്സ്യ"]):
        intent = "marine"
    elif domain_filter == "agriculture":
        intent = "agriculture"
    elif domain_filter in ["aviation", "aviation_marine"]:
        intent = "aviation"
    elif domain_filter in ["study", "study_research", "climate_research"]:
        intent = "climate_research"

    is_followup = any(w in q for w in ["what about", "will the", "aur kal", "then?"])

    # Location heuristic extraction:
    # Match patterns like: "in Kammanahalli", "at Whitefield", "near Indiranagar", "for Koramangala", "Kammanahalli weather"
    extracted_location = None
    m = re.search(r'\b(?:in|at|for|near|around)\s+([A-Za-z0-9\s\-]+?)(?:\s+(?:today|tomorrow|now|tonight|this|next|weather|forecast|rain)|\?|\.|$)', query, re.IGNORECASE)
    if m:
        candidate = m.group(1).strip()
        candidate = re.sub(r'^(the|a|an)\s+', '', candidate, flags=re.IGNORECASE)
        if len(candidate) >= 2 and candidate.lower() not in {"here", "my location", "current location", "india"}:
            extracted_location = candidate
    else:
        m2 = re.search(r'^([A-Za-z0-9\s\-]+?)\s+(?:weather|forecast|rain|temperature|aqi|mein|me|nalli)', query, re.IGNORECASE)
        if m2:
            candidate = m2.group(1).strip()
            candidate = re.sub(r'^(what is the|how is the|what about the|the|a|an)\s+', '', candidate, flags=re.IGNORECASE)
            if len(candidate) >= 2 and candidate.lower() not in {"here", "my location", "current location", "india"}:
                extracted_location = candidate

    return {
        "location": extracted_location,
        "intent_category": intent,
        "time_horizon": time_horizon,
        "is_followup": is_followup,
    }


async def extract_intent(
    query: str,
    session_language: str = "en",
    domain_filter: str = "normal",
    session_location: Optional[dict] = None,
) -> dict:
    """
    Extract QueryContext from user query using LLM function calling.
    Fast-path city detection runs first for zero-latency location resolution.
    """
    # 1. Script detection (instant)
    detected_lang = detect_script(query) or session_language

    # 2. Fast-path city detection (instant, no LLM)
    fast_city = fast_geocode(query)
    fast_location_name = fast_city[0] if fast_city else None

    # 3. LLM function-calling for full intent
    client = _get_client()
    model_id = get_verified_model_id()

    intent_tool = types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name="extract_weather_intent",
                description="Extract structured intent from a weather-related user query.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "location": types.Schema(type="STRING", description="Geographic location mentioned. Default to 'India'."),
                        "intent_category": types.Schema(type="STRING", enum=["urban_general","agriculture","aviation","marine","disaster_warning","climate_research"]),
                        "time_horizon": types.Schema(type="STRING", description="Time scope: current, today, tomorrow, next_3_days, next_7_days, historical."),
                        "is_followup": types.Schema(type="BOOLEAN", description="True if this is a follow-up to a previous question."),
                        "requires_chart": types.Schema(type="BOOLEAN", description="True if a time-series chart would best answer this."),
                        "detected_language": types.Schema(type="STRING", description="ISO 639-1 language code detected in the query."),
                    },
                    required=["location","intent_category","time_horizon"],
                ),
            )
        ]
    )

    intent = {}
    try:
        response = client.models.generate_content(
            model=model_id,
            contents=query,
            config=types.GenerateContentConfig(
                system_instruction=INTENT_EXTRACTION_PROMPT,
                tools=[intent_tool],
                temperature=0.1,
            ),
        )
        if response.candidates and response.candidates[0].content:
            for part in response.candidates[0].content.parts:
                if hasattr(part, "function_call") and part.function_call:
                    fc = part.function_call
                    if fc.name == "extract_weather_intent":
                        intent = dict(fc.args)
                        break

    except Exception as exc:
        logger.warning("LLM intent extraction failed, using heuristic fallback: %s", exc)

    # Apply heuristic fallback for any missing fields
    heur = heuristic_intent(query, domain_filter)
    for k, v in heur.items():
        if k not in intent or not intent[k]:
            intent[k] = v

    # 4. Location resolution order:
    # Prefer specific location extracted from user query (e.g. "Kammanahalli", "Whitefield", "Bandra")
    # over generic coarse fast-path city ("Bengaluru", "Mumbai").
    llm_loc = intent.get("location")
    is_specific_llm_loc = (
        llm_loc
        and llm_loc.strip().lower() not in {"india", "unknown", "here", "current location"}
    )

    if is_specific_llm_loc:
        location_name = llm_loc.strip()
        # Only use fast coords if the specific location is literally just the fast city name
        has_exact_fast_match = bool(fast_location_name and location_name.lower() == fast_location_name.lower())
    elif fast_location_name:
        location_name = fast_location_name
        has_exact_fast_match = True
    elif session_location and session_location.get("name"):
        location_name = session_location["name"]
        has_exact_fast_match = False
    else:
        location_name = "India"
        has_exact_fast_match = False

    return {
        "location": location_name,
        "intent_category": intent.get("intent_category", "urban_general"),
        "time_horizon": intent.get("time_horizon", "current"),
        "is_followup": intent.get("is_followup", False),
        "requires_chart": intent.get("requires_chart", False),
        "detected_language": intent.get("detected_language", detected_lang),
        "domain_filter": domain_filter,
        # Only pass fast-path coords if we matched the exact coarse city without a more specific sub-locality
        "_fast_lat": fast_city[1] if (fast_city and has_exact_fast_match) else None,
        "_fast_lon": fast_city[2] if (fast_city and has_exact_fast_match) else None,
        "_fast_state": fast_city[3] if (fast_city and has_exact_fast_match) else None,
    }
