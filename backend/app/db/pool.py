"""asyncpg connection pool lifecycle helpers."""

from __future__ import annotations

import asyncio
import logging
from typing import Optional

import asyncpg

from app.config import get_settings

logger = logging.getLogger(__name__)

_pool: Optional[asyncpg.Pool] = None
_pool_lock = asyncio.Lock()


async def init_pool() -> asyncpg.Pool:
    global _pool
    if _pool is not None:
        return _pool

    async with _pool_lock:
        if _pool is not None:
            return _pool

        settings = get_settings()
        logger.info("Creating asyncpg pool")
        _pool = await asyncpg.create_pool(
            dsn=settings.database_url,
            min_size=settings.pool_min_size,
            max_size=settings.pool_max_size,
            command_timeout=settings.request_timeout_seconds,
            statement_cache_size=0,  # Compatible with PgBouncer transaction pooling
        )
    return _pool


async def close_pool() -> None:
    global _pool
    if _pool is None:
        return
    logger.info("Closing asyncpg pool")
    await _pool.close()
    _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool is not initialized")
    return _pool
