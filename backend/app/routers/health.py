"""Health check endpoints."""

from __future__ import annotations

import asyncpg
from fastapi import APIRouter, Depends

from app.deps import get_db_conn

router = APIRouter(tags=["meta"])


@router.get("/healthz", summary="Liveness probe")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/readyz", summary="Readiness probe (also pings the database)")
async def readyz(conn: asyncpg.Connection = Depends(get_db_conn)) -> dict[str, str]:
    await conn.fetchval("SELECT 1")
    return {"status": "ready"}
