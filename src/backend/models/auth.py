"""
Authentication Relational ORMs and DTOs (`src/backend/models/auth.py`).

Defines persistence tables and validation schemas for 2-Step Authentication (`research/06_authentication.md`):
- `UserORM` (`users` table): Argon2id password hash, email, role (`admin`, `staff`).
- `OTPRecordORM` (`otps` table): 6-digit email OTPs with 10-minute expiry (`expires_at`).
- `SessionORM` (`sessions` table): Server-side sessions with secure token lookup.
- API Key verification DTOs (`CheckApiRequest`, `CheckApiResponse`).
"""

from datetime import datetime, timezone
import uuid
from typing import Optional
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from pydantic import BaseModel, Field, ConfigDict
try:
    from .orm import Base
except ImportError:
    from models.orm import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class UserORM(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="staff")  # admin, staff
    is_active = Column(Boolean, default=True)
    created_at = Column(String(64), default=lambda: datetime.now(timezone.utc).isoformat())

    otps = relationship("OTPRecordORM", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("SessionORM", back_populates="user", cascade="all, delete-orphan")


class OTPRecordORM(Base):
    __tablename__ = "otps"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    otp_code = Column(String(6), index=True, nullable=False)
    expires_at = Column(Integer, nullable=False)  # UTC timestamp seconds
    is_used = Column(Boolean, default=False)

    user = relationship("UserORM", back_populates="otps")


class SessionORM(Base):
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    session_token = Column(String(128), unique=True, index=True, nullable=False)
    expires_at = Column(Integer, nullable=False)
    created_at = Column(String(64), default=lambda: datetime.now(timezone.utc).isoformat())

    user = relationship("UserORM", back_populates="sessions")


# --- DTOs ---

class UserDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="User UUID")
    email: str = Field(..., description="User email address")
    role: str = Field(..., description="admin or staff")
    is_active: bool = Field(True)


class LoginStep1Request(BaseModel):
    email: str = Field(..., description="User email")
    password: str = Field(..., description="User password")


class LoginStep1Response(BaseModel):
    status: str = "otp_sent"
    email: str
    message: str = "A 6-digit OTP code has been generated and sent to your email (valid for 10 minutes)."
    dev_otp_preview: Optional[str] = None


class LoginStep2Request(BaseModel):
    email: str = Field(..., description="User email")
    otp_code: str = Field(..., description="6-digit OTP received via email")


class LoginStep2Response(BaseModel):
    status: str = "success"
    session_token: str
    user: UserDTO


class CheckApiRequest(BaseModel):
    provider: str = Field("deepseek", description="deepseek | groq | openai")
    api_key: str = Field(..., description="API Key (`sk-...` or `gsk_...`)")
    model: str = Field("deepseek-chat", description="Model name")


class CheckApiResponse(BaseModel):
    status: str = "valid"
    message: str = "Connection verified successfully!"
