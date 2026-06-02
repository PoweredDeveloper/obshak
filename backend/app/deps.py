"""Reusable FastAPI dependencies."""

from __future__ import annotations

import logging
from typing import AsyncIterator, Optional

import asyncpg
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.db import get_pool
from app.security import AuthError, AuthIdentity, verify_supabase_access_token

logger = logging.getLogger("obshak.api.auth")

bearer_scheme = HTTPBearer(
    bearerFormat="JWT",
    description="Paste the Supabase access token (`Authorization: Bearer ...`).",
    auto_error=False,
)


async def get_db_conn(request: Request) -> AsyncIterator[asyncpg.Connection]:
    pool: asyncpg.Pool = get_pool()
    async with pool.acquire() as conn:
        yield conn


async def get_optional_identity(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[AuthIdentity]:
    if creds is None:
        return None
    if creds.scheme.lower() != "bearer":
        # Drop the offending header silently — endpoint may not require auth.
        logger.warning("Ignoring non-Bearer Authorization scheme: %s", creds.scheme)
        return None
    try:
        return await verify_supabase_access_token(creds.credentials)
    except AuthError as exc:
        logger.warning("Ignoring invalid bearer token: %s", exc)
        # Endpoints that require auth use `get_current_identity` and will 401
        # explicitly. For optional-auth routes, treat a bad token as anonymous
        # rather than blocking public reads.
        return None


async def get_strict_optional_identity(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[AuthIdentity]:
    """Variant that 401s on a malformed/expired token; useful for /me."""
    if creds is None:
        return None
    if creds.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization scheme must be Bearer",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return await verify_supabase_access_token(creds.credentials)
    except AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
        ) from exc


async def get_current_identity(
    identity: Optional[AuthIdentity] = Depends(get_strict_optional_identity),
) -> AuthIdentity:
    if identity is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return identity
