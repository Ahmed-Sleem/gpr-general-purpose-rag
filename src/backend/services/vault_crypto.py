"""
Encrypted vault cryptography helpers.

WHY: The GPR product is intentionally no-login/device-only, but raw provider API
keys must not live in browser localStorage. This module centralizes AES-256-GCM
encryption so API keys are encrypted at rest with a Railway-supplied master key
and authenticated against the owning device/profile metadata.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
from dataclasses import dataclass
from typing import Optional

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


class VaultConfigError(RuntimeError):
    """Raised when the vault master key is absent or invalid."""


class VaultDecryptionError(RuntimeError):
    """Raised when encrypted key material cannot be authenticated/decrypted."""


@dataclass(frozen=True)
class EncryptedSecret:
    ciphertext: str
    nonce: str
    fingerprint: str
    key_hint: str


def _pad_base64(raw: str) -> str:
    return raw + "=" * (-len(raw) % 4)


def normalize_master_key(raw_value: str) -> bytes:
    """Decode a configured vault key into exactly 32 bytes for AES-256-GCM."""
    raw = (raw_value or "").strip()
    if not raw:
        raise VaultConfigError("GPR_VAULT_MASTER_KEY is required for encrypted API-key vault operations.")

    decode_attempts = (
        lambda value: base64.urlsafe_b64decode(_pad_base64(value)),
        lambda value: base64.b64decode(_pad_base64(value), validate=True),
        lambda value: value.encode("utf-8"),
    )
    for decoder in decode_attempts:
        try:
            key = decoder(raw)
        except Exception:
            continue
        if len(key) == 32:
            return key

    raise VaultConfigError("GPR_VAULT_MASTER_KEY must decode to exactly 32 bytes.")


def load_master_key() -> bytes:
    """Load the AES-256-GCM master key from the deployment environment."""
    return normalize_master_key(os.getenv("GPR_VAULT_MASTER_KEY", ""))


def build_associated_data(device_hash: str, profile_id: str, provider: str, model: str) -> bytes:
    """Bind ciphertext authentication to the profile owner and provider metadata."""
    return f"gpr-vault:v1:{device_hash}:{profile_id}:{provider}:{model}".encode("utf-8")


def fingerprint_api_key(api_key: str, master_key: Optional[bytes] = None) -> str:
    """Create a non-reversible keyed fingerprint for dedupe/audit without storing the key."""
    key = master_key or load_master_key()
    return hmac.new(key, api_key.strip().encode("utf-8"), hashlib.sha256).hexdigest()


def encrypt_api_key(
    api_key: str,
    *,
    device_hash: str,
    profile_id: str,
    provider: str,
    model: str,
) -> EncryptedSecret:
    """Encrypt a provider API key using AES-256-GCM and a fresh 12-byte nonce."""
    plaintext = api_key.strip()
    if not plaintext:
        raise ValueError("API key must not be empty.")

    master_key = load_master_key()
    nonce = os.urandom(12)
    aad = build_associated_data(device_hash, profile_id, provider, model)
    ciphertext = AESGCM(master_key).encrypt(nonce, plaintext.encode("utf-8"), aad)
    return EncryptedSecret(
        ciphertext=base64.urlsafe_b64encode(ciphertext).decode("ascii"),
        nonce=base64.urlsafe_b64encode(nonce).decode("ascii"),
        fingerprint=fingerprint_api_key(plaintext, master_key),
        key_hint=plaintext[-4:] if len(plaintext) >= 4 else "",
    )


def decrypt_api_key(
    *,
    encrypted_key: str,
    nonce: str,
    device_hash: str,
    profile_id: str,
    provider: str,
    model: str,
) -> str:
    """Decrypt and authenticate a vault-stored provider API key."""
    try:
        master_key = load_master_key()
        nonce_bytes = base64.urlsafe_b64decode(_pad_base64(nonce))
        ciphertext = base64.urlsafe_b64decode(_pad_base64(encrypted_key))
        aad = build_associated_data(device_hash, profile_id, provider, model)
        plaintext = AESGCM(master_key).decrypt(nonce_bytes, ciphertext, aad)
        return plaintext.decode("utf-8")
    except VaultConfigError:
        raise
    except Exception as exc:
        raise VaultDecryptionError("Stored API key could not be decrypted or authenticated.") from exc


def hash_device_secret(device_secret: str, master_key: Optional[bytes] = None) -> str:
    """Hash the HttpOnly device secret before it is used for database lookups."""
    key = master_key or load_master_key()
    return hmac.new(key, device_secret.encode("utf-8"), hashlib.sha256).hexdigest()
