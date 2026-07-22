"""
Device identity helpers for the no-login encrypted vault.

WHY: GPR keeps the user-facing product login-free. A high-entropy HttpOnly cookie
identifies the current browser/device to the server-side encrypted vault without
exposing that device secret to frontend JavaScript.
"""

from __future__ import annotations

import os
import secrets
from typing import Tuple

from fastapi import Request, Response

from .vault_crypto import hash_device_secret


DEVICE_COOKIE_NAME = "gpr_device_secret"
DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 400  # 400 days, similar to long-lived device memory.


def _cookie_secure(request: Request) -> bool:
    forced = os.getenv("GPR_COOKIE_SECURE", "").strip().lower()
    if forced in {"1", "true", "yes", "on"}:
        return True
    if forced in {"0", "false", "no", "off"}:
        return False
    return request.url.scheme == "https"


def set_device_cookie(response: Response, request: Request, device_secret: str) -> None:
    """Set the device cookie with HttpOnly protections and local-dev HTTPS awareness."""
    response.set_cookie(
        key=DEVICE_COOKIE_NAME,
        value=device_secret,
        max_age=DEVICE_COOKIE_MAX_AGE,
        httponly=True,
        secure=_cookie_secure(request),
        samesite="lax",
        path="/",
    )


def get_or_create_device_hash(request: Request, response: Response) -> Tuple[str, bool]:
    """Return the stable server-side device hash and whether a new cookie was issued."""
    device_secret = request.cookies.get(DEVICE_COOKIE_NAME)
    created = False
    if not device_secret or len(device_secret) < 32:
        device_secret = secrets.token_urlsafe(48)
        created = True
        set_device_cookie(response, request, device_secret)
    return hash_device_secret(device_secret), created
