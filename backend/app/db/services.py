"""SQL access for the marketplace `services` feature."""

from __future__ import annotations

from typing import List, Optional
from uuid import UUID

import asyncpg


_SERVICE_COLS = (
    "id, title, description, price, category_id, "
    "author_id, author_name, author_username, author_rating, "
    "reviews_count, is_active, created_at, updated_at"
)


async def list_categories(conn: asyncpg.Connection) -> List[asyncpg.Record]:
    return await conn.fetch(
        "SELECT id, name, icon FROM public.service_categories ORDER BY name"
    )


async def list_services(
    conn: asyncpg.Connection,
    *,
    limit: int,
    offset: int,
    category_id: Optional[UUID],
    search: str,
) -> tuple[List[asyncpg.Record], int]:
    where_parts = ["is_active = true"]
    params: list[object] = []
    if category_id is not None:
        params.append(category_id)
        where_parts.append(f"category_id = ${len(params)}")
    if search:
        params.append(f"%{search}%")
        where_parts.append(f"(title ILIKE ${len(params)} OR description ILIKE ${len(params)})")

    where_sql = " AND ".join(where_parts)

    list_sql = (
        f"SELECT {_SERVICE_COLS} FROM public.services "
        f"WHERE {where_sql} "
        f"ORDER BY created_at DESC "
        f"LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}"
    )
    list_params = [*params, limit, offset]

    count_sql = f"SELECT COUNT(*)::int FROM public.services WHERE {where_sql}"

    rows = await conn.fetch(list_sql, *list_params)
    total = await conn.fetchval(count_sql, *params)
    return rows, int(total or 0)


async def get_service(conn: asyncpg.Connection, *, service_id: UUID) -> Optional[asyncpg.Record]:
    return await conn.fetchrow(
        f"SELECT {_SERVICE_COLS} FROM public.services WHERE id = $1",
        service_id,
    )


async def list_reviews(
    conn: asyncpg.Connection,
    *,
    service_id: UUID,
    limit: int,
    offset: int,
) -> tuple[List[asyncpg.Record], int]:
    rows = await conn.fetch(
        """
        SELECT
            r.id, r.service_id, r.user_id, r.rating, r.comment,
            r.created_at, r.updated_at,
            p.first_name, p.last_name, p.group_name
        FROM public.service_reviews r
        LEFT JOIN public.profiles p ON p.id = r.user_id
        WHERE r.service_id = $1
        ORDER BY r.created_at DESC
        LIMIT $2 OFFSET $3
        """,
        service_id,
        limit,
        offset,
    )
    total = await conn.fetchval(
        "SELECT COUNT(*)::int FROM public.service_reviews WHERE service_id = $1",
        service_id,
    )
    return rows, int(total or 0)
