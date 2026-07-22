"""
Tests for the no-login encrypted device API-key vault.

These tests validate the backend security contract before the frontend migrates
away from raw localStorage API keys.
"""

import base64
import os
import secrets

# Set the test vault key before importing the FastAPI app or vault helpers.
os.environ["GPR_VAULT_MASTER_KEY"] = base64.urlsafe_b64encode(b"v" * 32).decode("ascii").rstrip("=")
os.environ["GPR_COOKIE_SECURE"] = "false"

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import delete, select

from main import app
from db.session import init_db, AsyncSessionLocal
from models.orm import VaultProfileORM
from services.vault_crypto import VaultDecryptionError, decrypt_api_key, normalize_master_key


@pytest.fixture(scope="module")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="module")
async def setup_db():
    await init_db()
    async with AsyncSessionLocal() as session:
        await session.execute(delete(VaultProfileORM))
        await session.commit()


@pytest.mark.anyio
async def test_vault_bootstrap_sets_httponly_cookie(setup_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.post("/api/v1/vault/bootstrap")
        assert response.status_code == 200
        assert response.json()["status"] == "ready"
        set_cookie = response.headers.get("set-cookie", "")
        assert "gpr_device_secret=" in set_cookie
        assert "HttpOnly" in set_cookie
        assert "SameSite=lax" in set_cookie


@pytest.mark.anyio
async def test_vault_profile_create_encrypts_key_and_returns_metadata_only(setup_db):
    raw_key = "sk-test-vault-secret-value-123456"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        await client.post("/api/v1/vault/bootstrap")
        create_resp = await client.post(
            "/api/v1/vault/profiles",
            json={
                "label": "Unit Test DeepSeek",
                "provider": "deepseek",
                "model": "deepseek-chat",
                "api_key": raw_key,
                "activate": True,
                "test_before_save": False,
            },
        )
        assert create_resp.status_code == 201, create_resp.text
        payload = create_resp.json()
        assert payload["label"] == "Unit Test DeepSeek"
        assert payload["provider"] == "deepseek"
        assert payload["is_active"] is True
        assert payload["key_hint"] == "3456"
        assert "api_key" not in payload
        assert "encrypted_key" not in payload
        assert raw_key not in create_resp.text

        async with AsyncSessionLocal() as session:
            result = await session.execute(select(VaultProfileORM).where(VaultProfileORM.id == payload["id"]))
            stored = result.scalars().one()
            assert stored.encrypted_key != raw_key
            assert stored.nonce != ""
            assert stored.key_fingerprint != raw_key
            decrypted = decrypt_api_key(
                encrypted_key=stored.encrypted_key,
                nonce=stored.nonce,
                device_hash=stored.device_hash,
                profile_id=stored.id,
                provider=stored.provider,
                model=stored.model,
            )
            assert decrypted == raw_key


@pytest.mark.anyio
async def test_vault_list_activate_delete_and_device_isolation(setup_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client_one:
        await client_one.post("/api/v1/vault/bootstrap")
        first = (await client_one.post(
            "/api/v1/vault/profiles",
            json={"label": "First", "provider": "groq", "model": "llama-3.3-70b-versatile", "api_key": "gsk_unit_test_key_first_12345", "activate": True},
        )).json()
        second = (await client_one.post(
            "/api/v1/vault/profiles",
            json={"label": "Second", "provider": "openai", "model": "gpt-4o-mini", "api_key": "sk-unit-test-key-second-12345", "activate": False},
        )).json()

        list_resp = await client_one.get("/api/v1/vault/profiles")
        assert list_resp.status_code == 200
        profiles = list_resp.json()
        assert len(profiles) >= 2
        assert all("encrypted_key" not in profile for profile in profiles)

        activate_resp = await client_one.post(f"/api/v1/vault/profiles/{second['id']}/activate")
        assert activate_resp.status_code == 200
        profiles_after = (await client_one.get("/api/v1/vault/profiles")).json()
        active = [profile for profile in profiles_after if profile["is_active"]]
        assert [profile["id"] for profile in active] == [second["id"]]

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client_two:
            await client_two.post("/api/v1/vault/bootstrap")
            isolated = await client_two.get("/api/v1/vault/profiles")
            assert isolated.status_code == 200
            assert isolated.json() == []

        delete_resp = await client_one.delete(f"/api/v1/vault/profiles/{second['id']}")
        assert delete_resp.status_code == 200
        remaining = (await client_one.get("/api/v1/vault/profiles")).json()
        assert any(profile["id"] == first["id"] and profile["is_active"] for profile in remaining)


@pytest.mark.anyio
async def test_vault_rejects_cross_device_decryption(setup_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        await client.post("/api/v1/vault/bootstrap")
        created = (await client.post(
            "/api/v1/vault/profiles",
            json={"label": "AAD Test", "provider": "deepseek", "model": "deepseek-chat", "api_key": "sk-aad-test-secret-12345"},
        )).json()

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(VaultProfileORM).where(VaultProfileORM.id == created["id"]))
        stored = result.scalars().one()
        with pytest.raises(VaultDecryptionError):
            decrypt_api_key(
                encrypted_key=stored.encrypted_key,
                nonce=stored.nonce,
                device_hash="wrong-device-hash",
                profile_id=stored.id,
                provider=stored.provider,
                model=stored.model,
            )


def test_vault_master_key_validation():
    valid = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode("ascii").rstrip("=")
    assert len(normalize_master_key(valid)) == 32
    with pytest.raises(Exception):
        normalize_master_key("too-short")
