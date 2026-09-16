"""
WeatherGPT v2.0 — Deterministic Risk Engine
CRITICAL: The LLM has ZERO involvement in risk scoring.
All risk levels are computed from threshold rules against retrieved data.
The LLM explains the risk — it does not generate it.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class RiskRecord:
    hazard: str
    level: str          # "Low" | "Moderate" | "High" | "Extreme" | "Critical"
    factors: list[str]  # Evidence points from actual data
    impact: str         # Human-readable impact description
    recommended_action: str
    rule_version: str = "2.0.0"
    domain: str = "normal"


# ─── Agriculture Risk Rules ──────────────────────────────────────────────────

def _assess_agriculture_risk(weather: dict, warnings: list[dict]) -> list[RiskRecord]:
    risks = []
    current = weather.get("current_weather", {})
    daily = weather.get("daily_forecast", [])

    rainfall_7d = sum(d.get("precipitation_sum", 0) for d in daily[:7])
    max_rain_day = max((d.get("precipitation_sum", 0) for d in daily[:7]), default=0)
    humidity = current.get("humidity", 0)
    temp = current.get("temperature", 25)
    wind = current.get("wind_speed", 0)

    # Rainfall risk
    if max_rain_day > 64.5:
        risks.append(RiskRecord(
            hazard="Extreme Rainfall",
            level="Extreme",
            factors=[
                f"Daily rainfall forecast: {max_rain_day:.1f}mm (IMD Heavy Rain threshold: >64.5mm)",
                f"7-day total: {rainfall_7d:.1f}mm",
            ],
            impact="Crop lodging, waterlogging, harvest loss, equipment damage risk.",
            recommended_action="Harvest mature crops immediately. Ensure drainage channels are clear. Suspend field operations.",
            domain="agriculture",
        ))
    elif max_rain_day > 35.5:
        risks.append(RiskRecord(
            hazard="Heavy Rainfall",
            level="High",
            factors=[f"Forecast rainfall: {max_rain_day:.1f}mm/day (threshold: >35.5mm)"],
            impact="Moderate waterlogging risk. Fungal disease weather conditions.",
            recommended_action="Delay sowing/transplanting. Avoid pesticide/fertilizer application. Check drainage.",
            domain="agriculture",
        ))
    elif max_rain_day < 2.5 and rainfall_7d < 5:
        risks.append(RiskRecord(
            hazard="Drought Stress",
            level="Moderate",
            factors=[f"7-day rainfall: {rainfall_7d:.1f}mm (well below requirement)"],
            impact="Moisture stress in rain-fed crops. Irrigation required.",
            recommended_action="Initiate irrigation for standing crops. Mulch to retain soil moisture.",
            domain="agriculture",
        ))

    # Temperature extremes
    if temp > 40:
        risks.append(RiskRecord(
            hazard="Heat Stress",
            level="High",
            factors=[f"Temperature: {temp}°C (crop heat stress threshold: >40°C)"],
            impact="Reduced pollination, fruit set failure, leaf burn in sensitive crops.",
            recommended_action="Irrigate early morning. Shade sensitive nurseries. Avoid daytime operations.",
            domain="agriculture",
        ))

    # High humidity (fungal risk indicator — weather only)
    if humidity > 85 and max_rain_day > 10:
        risks.append(RiskRecord(
            hazard="High Humidity / Wet Conditions",
            level="Moderate",
            factors=[
                f"Relative humidity: {humidity}% (threshold: >85%)",
                f"Rainfall: {max_rain_day:.1f}mm — prolonged leaf wetness expected",
            ],
            impact="Weather conditions conducive to fungal pressure. Consult extension officer for crop-specific guidance.",
            recommended_action="Avoid foliar sprays in wet conditions. Ensure canopy ventilation.",
            domain="agriculture",
        ))

    # Wind risk for spraying
    if wind > 20:
        risks.append(RiskRecord(
            hazard="High Wind",
            level="Moderate",
            factors=[f"Wind speed: {wind:.1f} km/h (spraying limit: <20 km/h)"],
            impact="Spray drift risk. Crop lodging possible in tall crops.",
            recommended_action="Suspend aerial and ground spraying operations until wind subsides.",
            domain="agriculture",
        ))

    return risks if risks else [RiskRecord(
        hazard="No Significant Agricultural Risk",
        level="Low",
        factors=["Weather parameters within normal agricultural operating range"],
        impact="Standard farming operations can proceed.",
        recommended_action="No special weather precautions needed. Monitor forecasts daily.",
        domain="agriculture",
    )]


# ─── Urban / Disaster Risk Rules ─────────────────────────────────────────────

def _assess_urban_risk(weather: dict, warnings: list[dict]) -> list[RiskRecord]:
    risks = []
    current = weather.get("current_weather", {})
    daily = weather.get("daily_forecast", [])

    max_rain = max((d.get("precipitation_sum", 0) for d in daily[:3]), default=0)
    temp = current.get("temperature", 25)
    wind = current.get("wind_speed", 0)
    aqi = weather.get("air_quality", {}) or {}
    aqi_val = aqi.get("us_aqi", 0) if aqi else 0

    # Active IMD warnings take precedence
    for w in warnings:
        severity = (w.get("severity") or "none").lower()
        hazard_title = w.get("hazard", "Severe Weather")
        desc = w.get("description", "")
        if severity == "red":
            risks.append(RiskRecord(
                hazard=hazard_title,
                level="Critical",
                factors=[
                    "OFFICIAL IMD RED WARNING in effect",
                    desc,
                ],
                impact="Potential severe threat to life and property. Stay updated on official channels.",
                recommended_action="Follow official IMD and local authority instructions. Avoid travel if warned.",
                domain="normal",
            ))
        elif severity == "orange":
            risks.append(RiskRecord(
                hazard=hazard_title,
                level="High",
                factors=[
                    "OFFICIAL IMD ORANGE ALERT in effect",
                    desc,
                ],
                impact="Be prepared for hazardous weather, localized disruption, and waterlogging.",
                recommended_action="Exercise caution during outdoor commutes. Follow local disaster management updates.",
                domain="normal",
            ))
        elif severity == "yellow":
            risks.append(RiskRecord(
                hazard=hazard_title,
                level="Moderate",
                factors=[
                    "OFFICIAL IMD YELLOW WATCH in effect",
                    desc,
                ],
                impact="Potential for isolated convective weather, lightning activity, and gusty winds.",
                recommended_action="Stay updated on local weather developments. Take shelter indoors during sudden lightning/thunder.",
                domain="normal",
            ))

    if max_rain > 64.5:
        risks.append(RiskRecord(
            hazard="Urban Flooding Risk",
            level="High",
            factors=[f"Forecast: {max_rain:.1f}mm rain in next 3 days"],
            impact="Urban flooding, waterlogging, traffic disruption.",
            recommended_action="Avoid low-lying areas. Check NDMA flood advisories.",
            domain="normal",
        ))

    if temp > 43:
        risks.append(RiskRecord(
            hazard="Severe Heatwave",
            level="Critical",
            factors=[f"Temperature: {temp}°C (severe heatwave threshold: >43°C)"],
            impact="Heat stroke risk. Elderly, children, and outdoor workers most vulnerable.",
            recommended_action="Stay indoors 11am–4pm. Drink water every 30 minutes. Check on vulnerable neighbours.",
            domain="normal",
        ))
    elif temp > 40:
        risks.append(RiskRecord(
            hazard="Heatwave",
            level="High",
            factors=[f"Temperature: {temp}°C (IMD heatwave threshold: >40°C in plains)"],
            impact="Heat-related illness risk for outdoor activities.",
            recommended_action="Limit outdoor exposure during peak hours. Stay hydrated.",
            domain="normal",
        ))

    if aqi_val > 200:
        risks.append(RiskRecord(
            hazard="Poor Air Quality",
            level="High" if aqi_val > 300 else "Moderate",
            factors=[f"US AQI: {aqi_val} ({aqi.get('category', 'Unhealthy')})"],
            impact="Respiratory irritation. Sensitive groups at risk.",
            recommended_action="Wear N95 mask outdoors. Avoid outdoor exercise. Use air purifier indoors.",
            domain="normal",
        ))

    return risks if risks else [RiskRecord(
        hazard="No Significant Risk",
        level="Low",
        factors=["Weather conditions normal for the season"],
        impact="Routine activities can proceed normally.",
        recommended_action="Standard precautions only. Monitor daily forecasts.",
        domain="normal",
    )]


# ─── Aviation Risk Rules (representative, not operational) ───────────────────

def _assess_aviation_risk(weather: dict, warnings: list[dict]) -> list[RiskRecord]:
    risks = []
    current = weather.get("current_weather", {})

    wind = current.get("wind_speed", 0)
    visibility = current.get("visibility", 10)  # km
    cloud_cover = current.get("cloud_cover", 0)
    weather_code = current.get("weather_code", 0)

    if wind > 60:
        risks.append(RiskRecord(
            hazard="High Surface Wind",
            level="High",
            factors=[f"Surface wind: {wind:.1f} km/h"],
            impact="Crosswind landing risk above aircraft limits.",
            recommended_action="REPRESENTATIVE ADVISORY ONLY. Consult DGCA/AAI ATIS for certified data.",
            domain="aviation",
        ))

    if visibility < 0.8:
        risks.append(RiskRecord(
            hazard="Low Visibility",
            level="High",
            factors=[f"Visibility: {visibility:.1f}km (instrument approach threshold: <0.8km)"],
            impact="IFR conditions. CAT I/II/III approach procedures may be required.",
            recommended_action="REPRESENTATIVE ADVISORY ONLY. Consult official METAR/TAF from AAI.",
            domain="aviation",
        ))
    elif visibility < 5:
        risks.append(RiskRecord(
            hazard="Reduced Visibility",
            level="Moderate",
            factors=[f"Visibility: {visibility:.1f}km"],
            impact="Visual flight conditions marginal.",
            recommended_action="REPRESENTATIVE ADVISORY ONLY. Check official aviation weather briefing.",
            domain="aviation",
        ))

    if weather_code in [95, 96, 99]:  # Thunderstorm codes
        risks.append(RiskRecord(
            hazard="Convective Activity / Thunderstorm",
            level="Critical",
            factors=[f"WMO code {weather_code}: Thunderstorm detected"],
            impact="Severe turbulence, wind shear, hail, lightning risk.",
            recommended_action="REPRESENTATIVE ADVISORY ONLY. Do not fly through CB cells. Consult official PIREPs.",
            domain="aviation",
        ))

    return risks if risks else [RiskRecord(
        hazard="No Significant Aviation Hazard (Representative)",
        level="Low",
        factors=["Wind, visibility, and convective activity within normal range"],
        impact="Representative conditions appear suitable for visual flight.",
        recommended_action="REPRESENTATIVE ADVISORY ONLY. Always check official DGCA/AAI ATIS before flight.",
        domain="aviation",
    )]


# ─── Marine Risk Rules (representative, not operational) ─────────────────────

def _assess_marine_risk(weather: dict, warnings: list[dict]) -> list[RiskRecord]:
    risks = []
    current = weather.get("current_weather", {})

    wind = current.get("wind_speed", 0)
    # Wave height estimated from wind speed (Beaufort approximation)
    # This is a rough estimate — not a replacement for official sea state data
    wave_height_est = (wind / 3.0) ** 1.2 * 0.12 if wind > 5 else 0

    if wind > 88:  # Beaufort 10+ (Storm)
        risks.append(RiskRecord(
            hazard="Storm Force Winds",
            level="Critical",
            factors=[f"Wind: {wind:.1f} km/h (Beaufort 10+ equivalent)"],
            impact="Extremely rough seas. All marine traffic at severe risk.",
            recommended_action="REPRESENTATIVE ADVISORY ONLY. All vessels should seek shelter. Check official MMD bulletins.",
            domain="marine",
        ))
    elif wind > 62:  # Beaufort 8-9 (Gale)
        risks.append(RiskRecord(
            hazard="Gale Force Winds",
            level="High",
            factors=[f"Wind: {wind:.1f} km/h (Beaufort 8-9 equivalent)", f"Estimated wave height: {wave_height_est:.1f}m"],
            impact="Very rough seas. Small craft in serious danger.",
            recommended_action="REPRESENTATIVE ADVISORY ONLY. Small craft should remain in port. Check MMD warnings.",
            domain="marine",
        ))
    elif wind > 38:  # Beaufort 6 (Strong breeze)
        risks.append(RiskRecord(
            hazard="Strong Winds / Rough Seas",
            level="Moderate",
            factors=[f"Wind: {wind:.1f} km/h"],
            impact="Rough conditions. Small vessels advise caution.",
            recommended_action="REPRESENTATIVE ADVISORY ONLY. Small fishing vessels exercise caution.",
            domain="marine",
        ))

    return risks if risks else [RiskRecord(
        hazard="No Significant Marine Hazard (Representative)",
        level="Low",
        factors=[f"Wind: {wind:.1f} km/h — moderate sea conditions expected"],
        impact="Representative conditions appear suitable for coastal operations.",
        recommended_action="REPRESENTATIVE ADVISORY ONLY. Always consult official MMD/IMD marine bulletins.",
        domain="marine",
    )]


# ─── Master Risk Assessment ───────────────────────────────────────────────────

def assess_risk(
    weather: dict,
    warnings: list[dict],
    domain_filter: str = "normal",
    intent_category: str = "urban_general",
) -> list[RiskRecord]:
    """
    Master entry point for risk assessment.
    Routes to the appropriate rule set based on domain_filter and intent_category.
    Returns a list of RiskRecord objects.
    """
    if domain_filter == "agriculture" or intent_category == "agriculture":
        return _assess_agriculture_risk(weather, warnings)
    elif domain_filter == "aviation" or intent_category == "aviation":
        return _assess_aviation_risk(weather, warnings)
    elif domain_filter == "marine" or intent_category == "marine":
        return _assess_marine_risk(weather, warnings)
    else:
        return _assess_urban_risk(weather, warnings)


def risk_records_to_dict(risks: list[RiskRecord]) -> list[dict]:
    """Serialize RiskRecord list to JSON-serializable dicts."""
    return [
        {
            "hazard": r.hazard,
            "level": r.level,
            "factors": r.factors,
            "impact": r.impact,
            "recommended_action": r.recommended_action,
            "rule_version": r.rule_version,
            "domain": r.domain,
        }
        for r in risks
    ]
