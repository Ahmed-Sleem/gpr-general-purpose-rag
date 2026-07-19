"""
Automated Test Suite for 2-Step Authentication (`src/backend/tests/test_auth.py`).

Verifies `GAP-ASKC-05`:
- User account creation with Argon2id password hashing (`POST /api/v1/auth/register`).
- Step 1 password check and 6-digit email OTP dispatch (`POST /api/v1/auth/step1-login`).
- Step 2 OTP verification and server-side session issuance (`POST /api/v1/auth/step2-verify-otp`).
- Session token inspection (`GET /api/v1/auth/me`).
"""

import time
import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from db.session import init_db


@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="module")
async def setup_db():
    await init_db()


@pytest.mark.anyio
async def test_full_auth_lifecycle(setup_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        test_email = f"ahmed_staff_{int(time.time())}@cyrkil.com"
        reg_payload = {"email": test_email, "password": "SecurePassword123!"}
        
        # Step 1: Register test user
        reg_resp = await client.post("/api/v1/auth/register", json=reg_payload)
        assert reg_resp.status_code == 201, f"Register failed: {reg_resp.text}"
        user_data = reg_resp.json()
        assert user_data["email"] == test_email
        assert user_data["role"] == "staff"

        # Step 2: Step 1 Login (Verify password and generate OTP)
        login1_resp = await client.post("/api/v1/auth/step1-login", json=reg_payload)
        assert login1_resp.status_code == 200, f"Step 1 Login failed: {login1_resp.text}"
        login1_data = login1_resp.json()
        assert login1_data["status"] == "otp_sent"
        assert "dev_otp_preview" in login1_data
        otp_code = login1_data["dev_otp_preview"]
        assert len(otp_code) == 6

        # Step 3: Step 2 Login (Verify OTP and get session token)
        login2_payload = {"email": test_email, "otp_code": otp_code}
        login2_resp = await client.post("/api/v1/auth/step2-verify-otp", json=login2_payload)
        assert login2_resp.status_code == 200, f"Step 2 Login failed: {login2_resp.text}"
        login2_data = login2_resp.json()
        assert login2_data["status"] == "success"
        session_token = login2_data["session_token"]
        assert len(session_token) > 20

        # Step 4: Verify active session inspection (`/api/v1/auth/me`)
        headers = {"Authorization": f"Bearer {session_token}"}
        me_resp = await client.get("/api/v1/auth/me", headers=headers)
        assert me_resp.status_code == 200, f"Session inspect failed: {me_resp.text}"
        me_data = me_resp.json()
        assert me_data["email"] == test_email
