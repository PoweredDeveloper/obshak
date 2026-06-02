"""User profile endpoints."""

from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.db import profiles as q
from app.deps import get_current_identity, get_db_conn
from app.schemas.profile import Me, Profile
from app.security import AuthIdentity

router = APIRouter(prefix="/me", tags=["profile"])


@router.get(
    "",
    response_model=Me,
    summary="Current user profile",
)
async def get_me(
    identity: AuthIdentity = Depends(get_current_identity),
    conn: asyncpg.Connection = Depends(get_db_conn),
) -> Me:
    row = await q.get_profile(conn, user_id=identity.user_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )
    profile = Profile(**dict(row))
    is_admin = False
    if profile.telegram_id is not None:
        is_admin = await q.is_admin(conn, telegram_id=profile.telegram_id)
    return Me(profile=profile, is_admin=is_admin)
