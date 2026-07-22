"""
Minimal auth models for device-only encrypted vault mode.

Only the CheckApi DTOs are retained (used by SettingsModal for live key testing).
All User/OTP/Session tables and related schemas have been removed for a clean professional codebase.
"""

from pydantic import BaseModel, Field


class CheckApiRequest(BaseModel):
    provider: str = Field("deepseek", description="deepseek | groq | gemini | openai")
    api_key: str = Field(..., description="API Key (`sk-...` or `gsk_...`)")
    model: str = Field("deepseek-chat", description="Model name")


class CheckApiResponse(BaseModel):
    status: str = "valid"
    message: str = "Connection verified successfully!"
