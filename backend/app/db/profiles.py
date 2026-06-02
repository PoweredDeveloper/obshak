"""SQL access for `profiles` (used by /me)."""

from __future__ import annotations

from typing import Optional
from uuid import UUID

import asyncpg


_PROFILE_COLS = (
    "id, telegram_id, first_name, last_name, username, photo_url, "
    "group_id, group_name, institute, course, semester, onboarded, "
    "last_active, created_at, updated_at"
)


async def get_profile(conn: asyncpg.Connection, *, user_id: UUID) -> Optional[asyncpg.Record]:
    return await conn.fetchrow(
        f"SELECT {_PROFILE_COLS} FROM public.profiles WHERE id = $1",
        user_id,
    )


async def is_admin(conn: asyncpg.Connection, *, telegram_id: int) -> bool:
    return bool(
        await conn.fetchval(
            "SELECT 1 FROM public.admins WHERE telegram_id = $1 LIMIT 1",
            telegram_id,
        )
    )
