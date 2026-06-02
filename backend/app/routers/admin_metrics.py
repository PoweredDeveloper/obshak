"""Admin-only aggregated metrics."""

from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.db import admin_metrics as q
from app.deps import get_current_identity, get_db_conn
from app.schemas.admin_metrics import UserStats
from app.security import AuthIdentity

router = APIRouter(prefix="/admin", tags=["admin"])


async def get_current_admin(
    identity: AuthIdentity = Depends(get_current_identity),
    conn: asyncpg.Connection = Depends(get_db_conn),
) -> AuthIdentity:
    row = await conn.fetchrow(
        "SELECT telegram_id FROM public.profiles WHERE id = $1",
        identity.user_id,
    )
    if row is None or row["telegram_id"] is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Profile not found")
    tid = int(row["telegram_id"])
    ok = await conn.fetchval(
        "SELECT 1 FROM public.admins WHERE telegram_id = $1 LIMIT 1",
        tid,
    )
    if not ok:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return identity


@router.get(
    "/users-stats",
    response_model=UserStats,
    summary="Aggregated user / bot metrics for the admin dashboard",
)
async def users_stats(
    _: AuthIdentity = Depends(get_current_admin),
    conn: asyncpg.Connection = Depends(get_db_conn),
) -> UserStats:
    data = await q.compute_user_stats(conn)
    return UserStats(**data)
