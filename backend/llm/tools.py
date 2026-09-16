"""
WeatherGPT v2.0 — LLM Function-Calling Tool Definitions (google-genai SDK)
These tools are used by the intent extraction step to get structured QueryContext from user queries.
The LLM calls these tools — it does NOT invent weather data through them.
"""

from google.genai import types


def get_intent_tools() -> list:
    """Return function-calling tools for intent/entity extraction from user query."""

    extract_weather_intent = types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name="extract_weather_intent",
                description=(
                    "Extract structured intent from a weather-related user query. "
                    "Use this for ALL weather questions."
                ),
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "location": types.Schema(
                            type="STRING",
                            description=(
                                "Geographic location mentioned in the query. "
                                "Use the most specific name found. "
                                "Default to 'India' if no location mentioned."
                            ),
                        ),
                        "intent_category": types.Schema(
                            type="STRING",
                            enum=[
                                "urban_general",
                                "agriculture",
                                "aviation",
                                "marine",
                                "disaster_warning",
                                "climate_research",
                            ],
                            description=(
                                "Primary intent of the weather query. "
                                "urban_general: general city weather. "
                                "agriculture: farming, crops, irrigation, soil. "
                                "aviation: wind, visibility, cloud base, turbulence. "
                                "marine: sea state, port conditions, waves. "
                                "disaster_warning: floods, cyclones, heatwaves, warnings. "
                                "climate_research: historical trends, anomalies, baseline comparison."
                            ),
                        ),
                        "time_horizon": types.Schema(
                            type="STRING",
                            description=(
                                "Time scope of the query: 'current', 'today', 'tomorrow', "
                                "'next_3_days', 'next_7_days', 'weekly', 'monthly', 'historical', "
                                "or a specific date/period mentioned."
                            ),
                        ),
                        "is_followup": types.Schema(
                            type="BOOLEAN",
                            description=(
                                "True if this query is a follow-up to a previous weather question "
                                "(e.g. 'what about tomorrow?', 'will it rain then?'). "
                                "False for new, standalone questions."
                            ),
                        ),
                        "requires_chart": types.Schema(
                            type="BOOLEAN",
                            description=(
                                "True if the question's intent would be best answered with a "
                                "time-series chart (e.g. 'trend', 'next 7 days', 'anomaly', "
                                "'historical comparison'). False for current conditions queries."
                            ),
                        ),
                        "detected_language": types.Schema(
                            type="STRING",
                            description=(
                                "ISO 639-1 code of the language detected in the query. "
                                "e.g. 'hi' for Hindi, 'ta' for Tamil, 'en' for English. "
                                "Detect from script if possible."
                            ),
                        ),
                    },
                    required=["location", "intent_category", "time_horizon"],
                ),
            )
        ]
    )

    return [extract_weather_intent]
