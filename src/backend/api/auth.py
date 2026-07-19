"""
Authentication API Router (`src/backend/api/auth.py`).

Provides 2-Step Authentication endpoints (`research/06_authentication.md`):
- `POST /api/v1/auth/register`: Create initial admin/staff users.
- `POST /api/v1/auth/step1-login`: Verify Argon2id password and dispatch 6-digit email OTP (10-min expiry).
- `POST /api/v1/auth/step2-verify-otp`: Verify OTP code and issue secure server-side session token.
- `GET /api/v1/auth/me`: Inspect active session token (`Authorization: Bearer <token>`).
"""

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
try:
    from ..db.session import get_db
    from ..models.auth import (
        UserORM, UserDTO, LoginStep1Request, LoginStep1Response,
        LoginStep2Request, LoginStep2Response
    )
    from ..services.auth_service import AuthService
except ImportError:
    from db.session import get_db
    from models.auth import (
        UserORM, UserDTO, LoginStep1Request, LoginStep1Response,
        LoginStep2Request, LoginStep2Response
    )
    from services.auth_service import AuthService

router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])


@router.post("/register", response_model=UserDTO, status_code=status.HTTP_201_CREATED)
async def register_user(
    payload: LoginStep1Request,
    role: str = "staff",
    session: AsyncSession = Depends(get_db)
):
    """Create a new staff or admin account with Argon2id password hashing."""
    auth_srv = AuthService(session)
    existing = await auth_srv.get_user_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    user = await auth_srv.create_user(payload.email, payload.password, role)
    return UserDTO.model_validate(user)


@router.post("/step1-login", response_model=LoginStep1Response)
async def login_step1(payload: LoginStep1Request, session: AsyncSession = Depends(get_db)):
    """Step 1: Verify Argon2id password and dispatch 6-digit email OTP valid for 10 minutes."""
    auth_srv = AuthService(session)
    user = await auth_srv.verify_password(payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    
    otp_code = await auth_srv.generate_otp_for_user(user)
    return LoginStep1Response(
        status="otp_sent",
        email=user.email,
        message="A 6-digit OTP code has been sent to your email address (valid for 10 minutes).",
        dev_otp_preview=otp_code
    )


@router.post("/step2-verify-otp", response_model=LoginStep2Response)
async def login_step2(payload: LoginStep2Request, session: AsyncSession = Depends(get_db)):
    """Step 2: Verify 6-digit OTP and issue secure server-side session token."""
    auth_srv = AuthService(session)
    success, user, msg = await auth_srv.verify_otp(payload.email, payload.otp_code)
    if not success or not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=msg)

    token, sess = await auth_srv.create_session(user)
    return LoginStep2Response(
        status="success",
        session_token=token,
        user=UserDTO.model_validate(user)
    )


@router.get("/me", response_model=UserDTO)
async def get_current_user(
    authorization: str = Header(..., alias="Authorization"),
    session: AsyncSession = Depends(get_db)
):
    """Retrieve active user account from server-side session token (`Authorization: Bearer <token>`)."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization header format")
    token = authorization.split("Bearer ", 1)[1].strip()
    auth_srv = AuthService(session)
    user_dto = await auth_srv.get_user_from_session_token(token)
    if not user_dto:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired or invalid")
    return user_dto
