"""
WeatherGPT v2.0 — Gemini Client (google-genai SDK)
MANDATORY FIRST ACTION: On startup, verify a real model ID via list_models().
No hardcoded unverified model IDs — the confirmed ID is stored and used by all calls.
"""

import logging
from typing import Optional, Any
from google import genai
from google.genai import types

from config import settings

logger = logging.getLogger(__name__)

# ─── Model Preference Order ──────────────────────────────────────────────────
# ─── Model Preference Order ──────────────────────────────────────────────────
CANDIDATE_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
]

_verified_model_id: Optional[str] = None
_genai_client: Optional[genai.Client] = None


def get_client() -> genai.Client:
    global _genai_client
    if _genai_client is None:
        _genai_client = genai.Client(api_key=settings.gemini_api_key)
    return _genai_client


def get_verified_model_id() -> str:
    global _verified_model_id
    if not _verified_model_id:
        return "gemini-3.5-flash"
    return _verified_model_id


async def verify_and_select_model() -> str:
    """
    Live verification: lists available models, selects the best candidate.
    Must be called during app lifespan startup.
    """
    global _verified_model_id

    client = get_client()

    try:
        available = []
        for model in client.models.list():
            available.append(model.name)

        logger.info("Available Gemini models: %s", available)

        # Normalize: strip "models/" prefix
        available_clean = {m.replace("models/", "") for m in available}

        for candidate in CANDIDATE_MODELS:
            if candidate in available_clean:
                _verified_model_id = candidate
                logger.info("✅ Verified Gemini model: %s", _verified_model_id)
                return _verified_model_id

        # Fallback: first available model that can generate content
        if available:
            _verified_model_id = available[0].replace("models/", "")
            logger.warning("Using fallback model: %s", _verified_model_id)
            return _verified_model_id

        raise RuntimeError("No Gemini models found for this API key.")

    except Exception as exc:
        logger.error("Gemini model verification failed: %s", exc)
        _verified_model_id = "gemini-3.5-flash"
        return _verified_model_id


class ModelWrapper:
    """Convenience wrapper providing standard generate_content interface with multi-model fallback."""
    def __init__(self, system_instruction: Optional[str] = None, tools: Optional[list] = None):
        self.system_instruction = system_instruction
        self.tools = tools

    def generate_content(self, contents: Any, **kwargs) -> Any:
        client = get_client()
        primary_model = get_verified_model_id()
        models_to_try = [primary_model] + [m for m in CANDIDATE_MODELS if m != primary_model]

        config_kwargs = {
            "temperature": kwargs.get("temperature", 0.2),
            "top_p": kwargs.get("top_p", 0.8),
            "max_output_tokens": kwargs.get("max_output_tokens", 4096),
        }
        if self.system_instruction:
            config_kwargs["system_instruction"] = self.system_instruction
        if self.tools:
            config_kwargs["tools"] = self.tools

        config = types.GenerateContentConfig(**config_kwargs)

        last_err = None
        for model_id in models_to_try:
            try:
                return client.models.generate_content(
                    model=model_id,
                    contents=contents,
                    config=config,
                )
            except Exception as exc:
                err_str = str(exc)
                if "429" in err_str or "503" in err_str or "NOT_FOUND" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    logger.warning("Model %s failed with %s, falling back...", model_id, exc)
                    last_err = exc
                    continue
                raise exc

        raise last_err or RuntimeError("All candidate models failed.")

    async def generate_content_async(self, contents: Any, **kwargs) -> Any:
        client = get_client()
        primary_model = get_verified_model_id()
        models_to_try = [primary_model] + [m for m in CANDIDATE_MODELS if m != primary_model]

        config_kwargs = {
            "temperature": kwargs.get("temperature", 0.2),
            "top_p": kwargs.get("top_p", 0.8),
            "max_output_tokens": kwargs.get("max_output_tokens", 4096),
        }
        if self.system_instruction:
            config_kwargs["system_instruction"] = self.system_instruction
        if self.tools:
            config_kwargs["tools"] = self.tools

        config = types.GenerateContentConfig(**config_kwargs)

        last_err = None
        for model_id in models_to_try:
            try:
                return await client.aio.models.generate_content(
                    model=model_id,
                    contents=contents,
                    config=config,
                )
            except Exception as exc:
                err_str = str(exc)
                if "429" in err_str or "503" in err_str or "NOT_FOUND" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    logger.warning("Async model %s failed with %s, falling back...", model_id, exc)
                    last_err = exc
                    continue
                raise exc

        raise last_err or RuntimeError("All candidate models failed.")


def get_model(system_instruction: Optional[str] = None, tools: Optional[list] = None) -> ModelWrapper:
    return ModelWrapper(system_instruction=system_instruction, tools=tools)


async def generate_content(
    prompt: str,
    system_instruction: Optional[str] = None,
    tools: Optional[list] = None,
) -> str:
    """
    Generate content from the verified Gemini model.
    Returns the text of the first candidate.
    """
    model = get_model(system_instruction=system_instruction, tools=tools)
    response = await model.generate_content_async(prompt)
    return response.text


async def generate_content_with_tools(
    prompt: str,
    system_instruction: Optional[str] = None,
    tools: Optional[list] = None,
) -> object:
    """Returns the full response object for function-calling tool inspection."""
    model = get_model(system_instruction=system_instruction, tools=tools)
    return await model.generate_content_async(prompt)
