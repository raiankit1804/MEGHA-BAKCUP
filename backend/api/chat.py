"""
WeatherGPT v2.0 — Main Chat Endpoint
POST /api/chat — orchestrates the full pipeline:
intent → location → weather fetch (tiered) → warnings → risk engine → synthesis → session update
"""

import logging
import time
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from core.session import (
    get_or_create_session, save_session, resolve_location,
    add_message, determine_turn_type,
)
from core.intent import extract_intent
from core.risk_engine import assess_risk, risk_records_to_dict
from core.synthesizer import synthesize_response, generate_followup_chips
from data.open_meteo import (
    geocode_location, reverse_geocode, fetch_tier1, fetch_tier2_nwp, RateLimitError,
    LOCALITY_ALIASES, HEADERS
)
from data.wttr import fetch_wttr
from data.synthetic import generate_synthetic_weather
from data.imd_scraper import fetch_warnings_for_location
from data.normalizer import (
    normalize_open_meteo, normalize_wttr, normalize_synthetic,
    compute_model_agreement,
)
from db.redis_client import weather_cache_get, weather_cache_set, warning_cache_get, warning_cache_set
from db.mongo import write_chat_message, ChatHistoryDoc, get_user_by_id
from api.auth import get_optional_user

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Chat"])


# ─── Request / Response Models ────────────────────────────────────────────────

class ChatRequest(BaseModel):
    query: str
    session_id: Optional[str] = None
    language: Optional[str] = None           # override session language
    domain_filter: Optional[str] = None      # override session domain filter
    # Location hints (GPS or manual)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    # Auth
    user_id: Optional[str] = None


class ChatResponse(BaseModel):
    session_id: str
    message_id: str
    turn_type: str                            # "establishing" | "followup"
    response_text: str                        # native language text
    response_text_english: str                # English text
    intent_category: str
    domain_filter: str
    resolved_location: str
    time_horizon: str
    requires_chart: bool
    weather_data: Optional[dict] = None
    warnings: list[dict] = []
    risks: list[dict] = []
    followup_chips_native: list[str] = []
    followup_chips_english: list[str] = []
    sources: list[dict] = []
    model_agreement: str = "not_applicable"
    data_freshness: str = "live"              # "live" | "cached" | "synthetic" | "fallback"
    latency_ms: int = 0


@router.get("/location/reverse")
async def get_reverse_location(lat: float, lon: float):
    """Reverse geocode coordinates to district/city and state (validated within India)."""
    res = await reverse_geocode(lat, lon)
    if res:
        return res
    return {
        "name": "Bengaluru",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "admin1": "Karnataka",
        "country_code": "IN",
    }


@router.get("/location/search")
async def search_locations(q: str):
    """Search for locations with high-granularity Indian localities, villages, and alias support."""
    import httpx
    clean_q = q.strip().lower()
    if not clean_q or len(clean_q) < 2:
        return []

    results = []
    seen = set()

    # 1. Check local alias database
    for alias_k, alias_val in LOCALITY_ALIASES.items():
        if alias_k in clean_q or clean_q in alias_k:
            key = f"{alias_val['latitude']:.3f},{alias_val['longitude']:.3f}"
            if key not in seen:
                seen.add(key)
                results.append(alias_val)

    # 2. Try Nominatim candidate expansion
    candidates = [q.strip()]
    if clean_q.endswith("pura") and not clean_q.endswith("apura"):
        candidates.append(q.strip()[:-4] + "apura")
    elif clean_q.endswith("apura"):
        candidates.append(q.strip()[:-5] + "pura")

    async with httpx.AsyncClient(headers=HEADERS, timeout=6) as client:
        for cand in candidates:
            try:
                resp = await client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={"q": cand, "format": "json", "addressdetails": 1, "countrycodes": "in", "limit": 6},
                )
                if resp.status_code == 200:
                    for item in resp.json():
                        lat = float(item["lat"])
                        lon = float(item["lon"])
                        key = f"{lat:.3f},{lon:.3f}"
                        if key in seen:
                            continue
                        seen.add(key)

                        addr = item.get("address", {})
                        village = addr.get("village")
                        suburb = addr.get("suburb") or addr.get("neighbourhood") or addr.get("residential")
                        city_district = addr.get("city_district")
                        amenity = addr.get("amenity")
                        p_name = item.get("name") or village or suburb or city_district or amenity or cand

                        if "ittagal" in p_name.lower():
                            p_name = "Ittagalpura"

                        city = addr.get("city") or addr.get("town")
                        if not city:
                            sd = addr.get("state_district", "")
                            if "Bengaluru" in sd or "Bangalore" in sd:
                                city = "Bengaluru"
                            elif sd:
                                city = sd.replace(" District", "").replace(" Urban", "").replace(" Rural", "")
                            else:
                                county = addr.get("county", "")
                                city = county.replace(" taluku", "").replace(" taluk", "") or "Bengaluru"

                        state = addr.get("state", "Karnataka")
                        display = f"{p_name}, {city}" if (city and city.lower() not in p_name.lower()) else p_name
                        results.append({
                            "name": display,
                            "raw_name": p_name,
                            "latitude": lat,
                            "longitude": lon,
                            "state": state,
                            "country_code": "IN",
                        })
                if results:
                    break
            except Exception as exc:
                logger.debug("Nominatim search candidate '%s' error: %s", cand, exc)

    # 3. Fallback: Open-Meteo search if Nominatim returned empty
    if not results:
        try:
            geo = await geocode_location(q)
            if geo:
                results.append(geo)
        except Exception:
            pass

    return results[:8]


@router.get("/location/detect")
async def detect_location():
    """Detect client location via public IP or default to Bengaluru, Karnataka."""
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            resp = await client.get("https://ipinfo.io/json")
            if resp.status_code == 200:
                data = resp.json()
                if data.get("country") == "IN":
                    loc = data.get("loc", "").split(",")
                    if len(loc) == 2:
                        lat, lon = float(loc[0]), float(loc[1])
                        # Try reverse geocode on IP coordinates for neighborhood granularity
                        rev = await reverse_geocode(lat, lon)
                        if rev and rev.get("name") and rev["name"] != "Unknown location":
                            return {
                                "name": rev["name"],
                                "latitude": lat,
                                "longitude": lon,
                                "state": rev.get("admin1", data.get("region", "Karnataka")),
                                "country_code": "IN",
                                "source": "ip",
                            }
                        city = data.get("city", "Bengaluru")
                        region = data.get("region", "Karnataka")
                        full_name = f"{city}, {region}" if region else city
                        return {
                            "name": full_name,
                            "latitude": lat,
                            "longitude": lon,
                            "state": region,
                            "country_code": "IN",
                            "source": "ip",
                        }
    except Exception as exc:
        logger.debug("IP location lookup skipped: %s", exc)

    return {
        "name": "Bengaluru, Karnataka",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "state": "Karnataka",
        "country_code": "IN",
        "source": "default",
    }


@router.get("/warnings")
async def get_location_warnings(
    location: str = "Bengaluru",
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    state: Optional[str] = None,
):
    """Fetch official IMD warnings and convective nowcasts for any Indian location."""
    weather_data = None
    if lat and lon:
        try:
            loc_info = {"latitude": lat, "longitude": lon, "admin1": state}
            tier1_raw = await fetch_tier1(lat, lon, loc_info)
            weather_data = normalize_open_meteo(tier1_raw, location_name=location)
        except Exception as exc:
            logger.warning("Weather fetch for warnings failed: %s", exc)
    warnings = await fetch_warnings_for_location(location, state=state, weather_data=weather_data)
    return {"warnings": warnings, "location": location}


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    start_time = time.time()

    # 1. Load / create session
    session = await get_or_create_session(req.session_id)

    # 2. Apply any overrides from request
    if req.language:
        session["language"] = req.language
    if req.domain_filter:
        session["domainFilter"] = req.domain_filter

    language = session["language"]
    domain_filter = session["domainFilter"]

    # 3. Extract intent (LLM function calling)
    gps_loc = None
    if req.latitude and req.longitude and abs(req.latitude - 20.5937) > 0.01:
        # Validate coordinates are strictly within India bounding box
        if 6.0 <= req.latitude <= 37.5 and 68.0 <= req.longitude <= 97.5:
            gps_loc = {"latitude": req.latitude, "longitude": req.longitude, "name": req.location_name or ""}
        else:
            logger.warning("Coordinates (%s, %s) are outside India — rejecting GPS override", req.latitude, req.longitude)

    # Sanitize session location if previously corrupted with out-of-India coords
    curr_sess_loc = session.get("sessionLocation")
    if curr_sess_loc:
        s_lat = curr_sess_loc.get("latitude")
        s_lon = curr_sess_loc.get("longitude")
        if s_lat is not None and s_lon is not None:
            if not (6.0 <= s_lat <= 37.5 and 68.0 <= s_lon <= 97.5):
                logger.warning("Purging out-of-bounds location (%s, %s) from session", s_lat, s_lon)
                session["sessionLocation"] = None

    intent = await extract_intent(
        query=req.query,
        session_language=language,
        domain_filter=domain_filter,
        session_location=session.get("sessionLocation"),
    )

    # 4. Resolve location (strict order: query location > request location > session > GPS > default)
    query_loc = intent.get("location")
    generic_names = {"india", "unknown", "unknown location", "here", "current location", "select location", "my location", ""}
    is_query_specific = bool(
        query_loc
        and query_loc.strip().lower() not in generic_names
        and not intent.get("is_followup", False)
    )

    explicit = None
    if is_query_specific:
        if intent.get("_fast_lat") and intent.get("_fast_lon"):
            explicit = {
                "name": intent["location"],
                "latitude": intent["_fast_lat"],
                "longitude": intent["_fast_lon"],
                "state": intent.get("_fast_state"),
            }
        else:
            # Forward geocode the specific micro-locality (e.g. Kammanahalli, Whitefield, Koramangala)
            geo = await geocode_location(intent["location"])
            if geo:
                explicit = {
                    "name": geo["name"],
                    "latitude": geo["latitude"],
                    "longitude": geo["longitude"],
                    "state": geo.get("admin1"),
                }
            else:
                explicit = {"name": intent["location"]}
    elif req.location_name and req.location_name.strip().lower() not in generic_names:
        if req.latitude and req.longitude and 6.0 <= req.latitude <= 37.5 and 68.0 <= req.longitude <= 97.5:
            explicit = {"name": req.location_name, "latitude": req.latitude, "longitude": req.longitude}
        else:
            geo = await geocode_location(req.location_name)
            if geo:
                explicit = {
                    "name": geo["name"],
                    "latitude": geo["latitude"],
                    "longitude": geo["longitude"],
                    "state": geo.get("admin1"),
                }
            else:
                explicit = {"name": req.location_name, "latitude": 12.9716, "longitude": 77.5946, "state": "Karnataka"}

    location = resolve_location(session, explicit_location=explicit, gps_location=gps_loc)
    location_name = location.get("name", "Bengaluru, Karnataka")
    lat = location.get("latitude")
    lon = location.get("longitude")
    state = location.get("state", "Karnataka")

    # 5. Reverse geocode if coordinates exist but name is generic
    if (not location_name or location_name.strip().lower() in generic_names) and lat and lon:
        rev = await reverse_geocode(lat, lon)
        if rev and rev.get("name") and rev["name"] != "Unknown location":
            city = rev["name"]
            st = rev.get("admin1", state or "")
            full_name = city if ("," in city or not st or city.lower() == st.lower()) else f"{city}, {st}"
            location_name = full_name
            state = st
            location.update({"name": full_name, "admin1": st, "state": st})
            session["sessionLocation"] = location

    # 6. Forward geocode if coordinates missing or still defaulting to India centroid
    if (lat is None or lon is None or (abs(lat - 20.5937) < 0.001 and abs(lon - 78.9629) < 0.001)) and location_name and location_name.strip().lower() not in generic_names:
        geo = await geocode_location(location_name)
        if geo:
            lat = geo["latitude"]
            lon = geo["longitude"]
            state = geo.get("admin1")
            location_name = geo["name"]
            location.update({"name": location_name, "latitude": lat, "longitude": lon, "state": state})
            session["sessionLocation"] = location

    # Default fallback to Bengaluru, Karnataka if unresolved or out-of-bounds
    if lat is None or lon is None or not (6.0 <= lat <= 37.5 and 68.0 <= lon <= 97.5):
        lat = 12.9716
        lon = 77.5946
        location_name = "Bengaluru, Karnataka"
        state = "Karnataka"
        location.update({"name": location_name, "latitude": lat, "longitude": lon, "state": state})
        session["sessionLocation"] = location

    # 6. Fetch weather (tiered, with Redis cache)
    cache_key = f"{lat:.3f},{lon:.3f}"
    weather_data = None
    data_freshness = "live"
    model_agreement = "not_applicable"
    sources = []

    # Check cache first
    cached = await weather_cache_get(cache_key)
    if cached:
        weather_data = cached
        data_freshness = "cached"
        sources = [{"name": weather_data.get("source", "Cache"), "type": "cached"}]
    else:
        # Tier 1: Open-Meteo (IMD-aligned)
        try:
            loc_info = {"latitude": lat, "longitude": lon, "admin1": state}
            tier1_raw = await fetch_tier1(lat, lon, loc_info)
            weather_data = normalize_open_meteo(tier1_raw, location_name, "Open-Meteo (IMD-aligned)", "forecast")
            sources.append({"name": "Open-Meteo (IMD-aligned)", "url": "https://open-meteo.com", "type": "primary"})

            # Tier 2: NWP/GFS (non-blocking, secondary)
            tier2_raw = await fetch_tier2_nwp(lat, lon, loc_info)
            if tier2_raw:
                tier2_data = normalize_open_meteo(tier2_raw, location_name, "Open-Meteo GFS/NWP", "model_guidance")
                # Compute model agreement on temperature
                t1_temp = weather_data.get("current_weather", {}).get("temperature")
                t2_temp = tier2_data.get("current_weather", {}).get("temperature")
                model_agreement = compute_model_agreement(t1_temp, t2_temp)
                weather_data["nwp_comparison"] = tier2_data.get("current_weather")
                weather_data["model_agreement"] = model_agreement
                sources.append({"name": "GFS NWP (model guidance)", "url": "https://open-meteo.com", "type": "secondary"})

            await weather_cache_set(cache_key, weather_data)

        except RateLimitError:
            logger.warning("Open-Meteo rate limited — falling back to wttr.in (Tier 3)")
            # Tier 3: wttr.in
            wttr_raw = await fetch_wttr(lat, lon)
            if wttr_raw:
                weather_data = normalize_wttr(wttr_raw, location_name, lat, lon)
                data_freshness = "fallback"
                sources.append({"name": "wttr.in (fallback)", "url": "https://wttr.in", "type": "fallback"})
            else:
                # Tier 4: Synthetic baseline
                logger.warning("wttr.in also failed — using Tier 4 synthetic baseline")
                weather_data = normalize_synthetic(
                    generate_synthetic_weather(lat, lon, location_name), location_name, lat, lon
                )
                data_freshness = "synthetic"
                sources.append({"name": "Synthetic Indian Climatic Baseline", "type": "synthetic"})

        except Exception as exc:
            logger.error("All weather fetches failed: %s — using synthetic", exc)
            weather_data = normalize_synthetic(
                generate_synthetic_weather(lat, lon, location_name), location_name, lat, lon
            )
            data_freshness = "synthetic"
            sources.append({"name": "Synthetic Indian Climatic Baseline", "type": "synthetic"})

    # 7. Fetch IMD warnings (non-blocking)
    warning_key = location_name.lower()
    warnings = await warning_cache_get(warning_key)
    if warnings is None:
        warnings = await fetch_warnings_for_location(location_name, state=state, weather_data=weather_data)
        await warning_cache_set(warning_key, warnings)

    # 8. Deterministic risk engine
    risks = assess_risk(
        weather=weather_data,
        warnings=warnings,
        domain_filter=domain_filter,
        intent_category=intent.get("intent_category", "urban_general"),
    )

    # 9. Determine turn type
    turn_type = determine_turn_type(session)
    # If the user explicitly asks about a different location, treat as establishing turn
    if explicit and explicit.get("name") and session.get("messages"):
        prev_loc = session.get("sessionLocation", {}).get("name")
        if prev_loc and explicit.get("name").lower() not in prev_loc.lower():
            turn_type = "establishing"

    # 10. Synthesize bilingual response (tailored to establishing vs followup)
    native_text, english_text = await synthesize_response(
        query=req.query,
        weather=weather_data,
        warnings=warnings,
        risks=risks,
        domain_filter=domain_filter,
        target_language=language,
        time_horizon=intent.get("time_horizon", "current"),
        turn_type=turn_type,
        conversation_history=session.get("messages", []),
    )

    # 11. Generate follow-up chips
    followup_native, followup_english = await generate_followup_chips(
        advisory_text=english_text,
        location=location_name,
        domain_filter=domain_filter,
        target_language=language,
    )

    # 12. Add messages to session
    # User message
    add_message(session, role="user", turn_type="user", text_en=req.query)

    # Assistant message
    msg = add_message(
        session,
        role="assistant",
        turn_type=turn_type,
        text_en=english_text,
        text_native=native_text if language != "en" else None,
        native_language=language if language != "en" else None,
        domain_filter=domain_filter,
        weather_data=weather_data,
        warnings=warnings,
        risks=risk_records_to_dict(risks),
        followup_chips_native=followup_native,
        followup_chips_english=followup_english,
        requires_chart=intent.get("requires_chart", False),
    )

    # 13. Save session to Redis
    await save_session(session)

    # 14. Optionally write to MongoDB chat history
    user = None
    if req.user_id:
        user = await get_user_by_id(req.user_id)
    if user and user.get("history_opt_in"):
        try:
            await write_chat_message(ChatHistoryDoc(
                user_id=str(user["_id"]),
                session_id=session["session_id"],
                role="assistant",
                turn_type=turn_type,
                text_en=english_text,
                text_native=native_text if language != "en" else None,
                native_language=language if language != "en" else None,
                domain_filter=domain_filter,
                location_name=location_name,
                latitude=lat,
                longitude=lon,
            ))
        except Exception as exc:
            logger.warning("MongoDB history write failed (non-critical): %s", exc)

    latency_ms = int((time.time() - start_time) * 1000)

    return ChatResponse(
        session_id=session["session_id"],
        message_id=msg["id"],
        turn_type=turn_type,
        response_text=native_text,
        response_text_english=english_text,
        intent_category=intent.get("intent_category", "urban_general"),
        domain_filter=domain_filter,
        resolved_location=location_name,
        time_horizon=intent.get("time_horizon", "current"),
        requires_chart=intent.get("requires_chart", False),
        weather_data=weather_data,
        warnings=warnings,
        risks=risk_records_to_dict(risks),
        followup_chips_native=followup_native,
        followup_chips_english=followup_english,
        sources=sources,
        model_agreement=model_agreement,
        data_freshness=data_freshness,
        latency_ms=latency_ms,
    )
