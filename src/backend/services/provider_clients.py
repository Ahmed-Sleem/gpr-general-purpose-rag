"""
Provider client helpers for live API-key validation and streaming.

WHY: API-key checks are used by both the legacy settings route and the encrypted
vault. Keeping provider access in one module prevents divergent behavior and
ensures production never reports fake success when dependencies or providers fail.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

try:
    from ..agent.prompts import build_provider_healthcheck_prompt
except ImportError:
    from agent.prompts import build_provider_healthcheck_prompt

try:
    from openai import AsyncOpenAI
except ImportError:  # pragma: no cover - exercised only if dependency missing
    AsyncOpenAI = None


@dataclass(frozen=True)
class ProviderCheckResult:
    status: str
    message: str
    preview: str = ""


def default_model_for_provider(provider: str, model: str = "") -> str:
    cleaned_provider = provider.lower().strip()
    if model and model.strip():
        return model.strip()
    if cleaned_provider == "groq":
        return "llama-3.3-70b-versatile"
    if cleaned_provider == "gemini":
        return "gemini-1.5-flash"
    if cleaned_provider == "openai":
        return "gpt-4o-mini"
    return "deepseek-chat"


def base_url_for_provider(provider: str) -> str:
    cleaned_provider = provider.lower().strip()
    if cleaned_provider == "groq":
        return "https://api.groq.com/openai/v1"
    if cleaned_provider == "openai":
        return "https://api.openai.com/v1"
    if cleaned_provider == "gemini":
        return "https://generativelanguage.googleapis.com/v1beta/openai/"
    return "https://api.deepseek.com"


async def check_provider_connection(provider: str, model: str, api_key: str) -> ProviderCheckResult:
    """Verify a provider key using a tiny real prompt without exposing the key."""
    provider_clean = provider.lower().strip()
    model_clean = default_model_for_provider(provider_clean, model)
    key_clean = api_key.strip()
    if len(key_clean) < 5:
        return ProviderCheckResult(status="error", message="API key is required and must not be empty.")

    try:
        if provider_clean == "gemini":
            import httpx
            async with httpx.AsyncClient(timeout=8.0) as http_client:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_clean}:generateContent?key={key_clean}"
                res = await http_client.post(
                    url,
                    headers={"Content-Type": "application/json", "X-goog-api-key": key_clean},
                    json={"contents": [{"parts": [{"text": build_provider_healthcheck_prompt()}]}]},
                )
                if res.status_code == 200:
                    data = res.json()
                    preview = ""
                    try:
                        preview = data["candidates"][0]["content"]["parts"][0].get("text", "")[:80]
                    except Exception:
                        preview = ""
                    return ProviderCheckResult(status="valid", message=f"Verified Google Gemini model '{model_clean}'.", preview=preview)
                err_text = res.text[:240]
                try:
                    err_json = res.json()
                    err_text = err_json.get("error", {}).get("message", err_text)
                except Exception:
                    pass
                return ProviderCheckResult(status="error", message=f"Google Gemini Error ({res.status_code}): {err_text}")

        if AsyncOpenAI is None:
            return ProviderCheckResult(status="error", message="OpenAI-compatible client dependency is unavailable on the server.")

        client = AsyncOpenAI(api_key=key_clean, base_url=base_url_for_provider(provider_clean), timeout=8.0)
        response = await client.chat.completions.create(
            model=model_clean,
            messages=[{"role": "user", "content": build_provider_healthcheck_prompt()}],
            max_tokens=4,
            temperature=0,
        )
        preview = (response.choices[0].message.content or "")[:80] if response and response.choices else ""
        if preview:
            return ProviderCheckResult(status="valid", message=f"Verified {provider_clean.upper()} model '{model_clean}'.", preview=preview)
        return ProviderCheckResult(status="error", message="No response returned from API provider.")
    except Exception as exc:
        return ProviderCheckResult(status="error", message=f"Connection Error: {str(exc)[:240]}")
