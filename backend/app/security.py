"""Authentication helpers.

Two flows are exposed:

* `verify_supabase_token` — verify an HS256 access token issued by Supabase
  Auth (the frontend already uses this token). Production uses this today.
* `validate_init_data` / `validate_login_widget` — re-implement the Telegram
  signature checks from the existing Edge Function so we can later issue our
  own JWTs from Python.
"""

from __future__ import annotations

import hashlib
import hmac
from dataclasses import dataclass
from typing import Any, Dict, Optional
from urllib.parse import parse_qsl
from uuid import UUID

import httpx
from jose import JWTError, jwt

from app.config import get_settings


@dataclass(frozen=True)
class AuthIdentity:
    user_id: UUID
    email: Optional[str]
    telegram_id: Optional[int]
    raw_claims: Dict[str, Any]


class AuthError(Exception):
    """Raised when token verification or signature validation fails."""


async def verify_supabase_access_token(token: str) -> AuthIdentity:
    """Validate Supabase access token.

    Prefer GoTrue ``GET /auth/v1/user`` when ``SUPABASE_URL`` + publishable key
    are set — signature always matches hosted/local Supabase (no JWT_SECRET drift).

    Fallback: local HS256 decode with ``SUPABASE_JWT_SECRET`` (dev / air-gapped).
    """
    settings = get_settings()
    base = (settings.supabase_url or "").strip().rstrip("/")
    pub = (settings.supabase_publishable_key or "").strip()

    if base and pub:
        url = f"{base}/auth/v1/user"
        try:
            async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
                r = await client.get(
                    url,
                    headers={"Authorization": f"Bearer {token}", "apikey": pub},
                )
        except httpx.RequestError as exc:
            raise AuthError(f"auth_upstream_unreachable: {exc}") from exc

        if r.status_code in (401, 403):
            raise AuthError("invalid_token: rejected by Supabase Auth")
        if r.status_code != 200:
            raise AuthError(f"auth_upstream_error: HTTP {r.status_code}")

        data = r.json()
        uid = data.get("id")
        if not uid:
            raise AuthError("invalid_token: missing user id in auth response")
        try:
            user_id = UUID(str(uid))
        except ValueError as exc:
            raise AuthError("invalid_token: user id is not a UUID") from exc

        meta = data.get("user_metadata") or {}
        tid = meta.get("telegram_id")
        return AuthIdentity(
            user_id=user_id,
            email=data.get("email"),
            telegram_id=int(tid) if tid is not None else None,
            raw_claims=data,
        )

    if settings.supabase_jwt_secret:
        return verify_supabase_token(token)

    raise AuthError(
        "server_misconfigured: set SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY "
        "(recommended) or SUPABASE_JWT_SECRET"
    )


def verify_supabase_token(token: str) -> AuthIdentity:
    settings = get_settings()
    if not settings.supabase_jwt_secret:
        raise AuthError("server_misconfigured: SUPABASE_JWT_SECRET is empty")

    try:
        claims = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience=settings.supabase_jwt_audience,
            options={"verify_aud": True},
        )
    except JWTError as exc:
        raise AuthError(f"invalid_token: {exc}") from exc

    sub = claims.get("sub")
    if not sub:
        raise AuthError("invalid_token: missing sub")

    try:
        user_id = UUID(str(sub))
    except ValueError as exc:
        raise AuthError("invalid_token: sub is not a UUID") from exc

    metadata = claims.get("user_metadata") or {}
    telegram_id = metadata.get("telegram_id")

    return AuthIdentity(
        user_id=user_id,
        email=claims.get("email"),
        telegram_id=int(telegram_id) if telegram_id is not None else None,
        raw_claims=claims,
    )


def _telegram_secret_for_init_data(bot_token: str) -> bytes:
    return hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()


def validate_init_data(init_data: str, bot_token: str) -> Dict[str, str]:
    """Validate Telegram Mini App `initData` query string."""

    pairs = list(parse_qsl(init_data, keep_blank_values=True, strict_parsing=False))
    received_hash: Optional[str] = None
    filtered: list[tuple[str, str]] = []
    for k, v in pairs:
        if k == "hash":
            received_hash = v
        else:
            filtered.append((k, v))
    if not received_hash:
        raise AuthError("missing hash")

    filtered.sort(key=lambda kv: kv[0])
    data_check_string = "\n".join(f"{k}={v}" for k, v in filtered)

    secret = _telegram_secret_for_init_data(bot_token)
    expected_hash = hmac.new(secret, data_check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_hash, received_hash):
        raise AuthError("invalid initData signature")

    return dict(pairs)


def validate_login_widget(payload: Dict[str, Any], bot_token: str) -> Dict[str, Any]:
    """Validate Telegram Login Widget payload."""

    received_hash = payload.get("hash")
    if not received_hash:
        raise AuthError("missing hash")

    items = [
        (str(k), str(v))
        for k, v in payload.items()
        if k != "hash" and v is not None and v != ""
    ]
    items.sort(key=lambda kv: kv[0])
    data_check_string = "\n".join(f"{k}={v}" for k, v in items)

    secret = hashlib.sha256(bot_token.encode()).digest()
    expected_hash = hmac.new(secret, data_check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_hash, str(received_hash)):
        raise AuthError("invalid login widget signature")

    return payload
