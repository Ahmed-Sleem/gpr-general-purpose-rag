"""
Authentication Service (`src/backend/services/auth_service.py`).

Handles 2-Step Authentication business logic:
1. Argon2id password hashing and verification (`passlib.hash.argon2`).
2. 6-digit email OTP generation (`random.randint(100000, 999999)`) with 10-minute expiration (`int(time.time()) + 600`).
3. Server-side session token management (`secrets.token_urlsafe(64)`).
"""

import time
import random
import secrets
from typing import Optional, Tuple
from passlib.hash import argon2
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
try:
    from ..models.auth import UserORM, OTPRecordORM, SessionORM, UserDTO
except ImportError:
    from models.auth import UserORM, OTPRecordORM, SessionORM, UserDTO


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_user_by_email(self, email: str) -> Optional[UserORM]:
        result = await self.session.execute(select(UserORM).where(UserORM.email == email.strip().lower()))
        return result.scalars().first()

    async def create_user(self, email: str, password: str, role: str = "staff") -> UserORM:
        existing = await self.get_user_by_email(email)
        if existing:
            return existing
        pwd_hash = argon2.hash(password)
        user = UserORM(
            email=email.strip().lower(),
            password_hash=pwd_hash,
            role=role
        )
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def verify_password(self, email: str, password: str) -> Optional[UserORM]:
        user = await self.get_user_by_email(email)
        if not user or not user.is_active:
            return None
        if argon2.verify(password, user.password_hash):
            return user
        return None

    async def generate_otp_for_user(self, user: UserORM) -> str:
        """Generate a 6-digit OTP code valid for 10 minutes (600 seconds)."""
        result = await self.session.execute(select(OTPRecordORM).where(OTPRecordORM.user_id == user.id, OTPRecordORM.is_used == False))
        for old_otp in result.scalars().all():
            old_otp.is_used = True
        
        otp_code = f"{random.randint(100000, 999999)}"
        expires_at = int(time.time()) + 600

        otp_record = OTPRecordORM(
            user_id=user.id,
            otp_code=otp_code,
            expires_at=expires_at,
            is_used=False
        )
        self.session.add(otp_record)
        await self.session.commit()
        return otp_code

    async def verify_otp(self, email: str, otp_code: str) -> Tuple[bool, Optional[UserORM], str]:
        user = await self.get_user_by_email(email)
        if not user:
            return False, None, "User not found"

        now = int(time.time())
        stmt = select(OTPRecordORM).where(
            OTPRecordORM.user_id == user.id,
            OTPRecordORM.otp_code == otp_code.strip(),
            OTPRecordORM.is_used == False,
            OTPRecordORM.expires_at > now
        ).order_by(OTPRecordORM.expires_at.desc())
        
        result = await self.session.execute(stmt)
        otp_record = result.scalars().first()
        if not otp_record:
            return False, None, "Invalid or expired OTP code"

        otp_record.is_used = True
        await self.session.commit()
        return True, user, "OTP verified successfully"

    async def create_session(self, user: UserORM) -> Tuple[str, SessionORM]:
        """Create a server-side session token valid for 24 hours (86400 seconds)."""
        token = secrets.token_urlsafe(64)
        expires_at = int(time.time()) + 86400

        sess = SessionORM(
            user_id=user.id,
            session_token=token,
            expires_at=expires_at
        )
        self.session.add(sess)
        await self.session.commit()
        await self.session.refresh(sess)
        return token, sess

    async def get_user_from_session_token(self, token: str) -> Optional[UserDTO]:
        now = int(time.time())
        stmt = select(SessionORM).where(SessionORM.session_token == token.strip(), SessionORM.expires_at > now)
        result = await self.session.execute(stmt)
        sess = result.scalars().first()
        if not sess:
            return None
        # Explicit async fetch of user entity to avoid async lazy-load exceptions
        user = await self.session.get(UserORM, sess.user_id)
        if not user or not user.is_active:
            return None
        return UserDTO.model_validate(user)
