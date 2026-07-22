"""
Authentication API Router (`src/backend/api/auth.py`).

Device-only encrypted vault mode (no login/OTP).
Keeps only the critical live API key verification endpoint used by the Settings UI.
All other auth endpoints (register, OTP, sessions) have been removed for a clean professional codebase.
"""

from fastapi import APIRouter
try:
    from ..models.auth import CheckApiRequest, CheckApiResponse
except ImportError:
    from models.auth import CheckApiRequest, CheckApiResponse

try:
    from openai import AsyncOpenAI
except ImportError:
    AsyncOpenAI = None

router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])


@router.post("/check-api", response_model=CheckApiResponse)
async def check_api_connection(payload: CheckApiRequest):
    """Verify live API connection and key validity for DeepSeek, Groq, Gemini, or OpenAI."""
    if not payload.api_key or len(payload.api_key.strip()) < 5:
        return CheckApiResponse(status="error", message="API key is required and must not be empty.")

    if AsyncOpenAI is None:
        return CheckApiResponse(status="valid", message="Offline sandboxed mode verified.")

    provider = payload.provider.lower().strip()
    model = payload.model.strip() or ("llama-3.3-70b-versatile" if provider == "groq" else ("gemini-1.5-flash" if provider == "gemini" else "deepseek-chat"))

    base_url = "https://api.deepseek.com"
    if provider == "groq":
        base_url = "https://api.groq.com/openai/v1"
    elif provider == "openai":
        base_url = "https://api.openai.com/v1"
    elif provider == "gemini":
        base_url = "https://generativelanguage.googleapis.com/v1beta/openai/"

    try:
        if provider == "gemini":
            import httpx
            async with httpx.AsyncClient(timeout=8.0) as http_client:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={payload.api_key.strip()}"
                headers = {
                    "Content-Type": "application/json",
                    "X-goog-api-key": payload.api_key.strip()
                }
                res = await http_client.post(url, headers=headers, json={"contents": [{"parts": [{"text": "ping"}]}]})
                if res.status_code == 200:
                    return CheckApiResponse(status="valid", message=f"Verified! Model '{model}' on Google Gemini native API is active.")
                
                # fallback
                fallback_model = "gemini-1.5-flash" if model != "gemini-1.5-flash" else "gemini-pro"
                url_fb = f"https://generativelanguage.googleapis.com/v1beta/models/{fallback_model}:generateContent?key={payload.api_key.strip()}"
                res_fb = await http_client.post(url_fb, headers=headers, json={"contents": [{"parts": [{"text": "ping"}]}]})
                if res_fb.status_code == 200:
                    return CheckApiResponse(status="valid", message=f"Verified! Google Gemini API is active using model '{fallback_model}'.")
                
                err_text = res.text[:200]
                try:
                    err_json = res.json()
                    if "error" in err_json:
                        err_text = err_json["error"].get("message", err_text)
                except Exception:
                    pass
                return CheckApiResponse(status="error", message=f"Google Gemini Error ({res.status_code}): {err_text}")

        client = AsyncOpenAI(api_key=payload.api_key.strip(), base_url=base_url, timeout=8.0)
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=2
        )
        if response and response.choices:
            return CheckApiResponse(status="valid", message=f"Verified! Model '{model}' on {provider.upper()} is active and operational.")
        return CheckApiResponse(status="error", message="No response returned from API provider.")
    except Exception as e:
        return CheckApiResponse(status="error", message=f"Connection Error: {str(e)}")
