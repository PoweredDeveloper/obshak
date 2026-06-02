"""SQL access for teachers and teacher ratings.

Aggregates (`average_rating`, `ratings_count`) are computed live from
`teacher_ratings` so we never depend on a stale denormalized column.
"""

from __future__ import annotations

from typing import List, Optional, Sequence
from uuid import UUID

import asyncpg


_BASE_SELECT = """
SELECT
    t.id,
    t.full_name,
    t.department,
    t.email,
    COALESCE(rs.cnt, 0)::int                       AS ratings_count,
    rs.avg                                         AS average_rating,
    ur.rating                                      AS user_rating
FROM public.teachers t
LEFT JOIN LATERAL (
    SELECT
        COUNT(*)::int                               AS cnt,
        ROUND(AVG(rating::numeric), 2)              AS avg
    FROM public.teacher_ratings
    WHERE teacher_id = t.id
) rs ON true
LEFT JOIN public.teacher_ratings ur
    ON ur.teacher_id = t.id AND ur.user_id = $1
"""


async def list_teachers(
    conn: asyncpg.Connection,
    *,
    user_id: Optional[UUID],
    limit: int,
    offset: int,
    search: str,
    sort_by: str,
) -> tuple[List[asyncpg.Record], int]:
    where = ""
    params: list[object] = [user_id]
    if search:
        where = "WHERE t.full_name ILIKE $2 OR t.department ILIKE $2"
        params.append(f"%{search}%")

    if sort_by == "name":
        order = "ORDER BY t.full_name ASC"
    else:
        order = "ORDER BY rs.avg DESC NULLS LAST, t.full_name ASC"

    list_sql = f"""
        {_BASE_SELECT}
        {where}
        {order}
        LIMIT ${len(params) + 1} OFFSET ${len(params) + 2}
    """
    list_params = [*params, limit, offset]

    count_sql = "SELECT COUNT(*)::int FROM public.teachers t " + where
    count_params = params[1:] if search else []

    rows = await conn.fetch(list_sql, *list_params)
    total = await conn.fetchval(count_sql, *count_params)
    return rows, int(total or 0)


async def get_teacher(
    conn: asyncpg.Connection, *, teacher_id: UUID, user_id: Optional[UUID]
) -> Optional[asyncpg.Record]:
    return await conn.fetchrow(
        f"{_BASE_SELECT} WHERE t.id = $2",
        user_id,
        teacher_id,
    )


async def upsert_rating(
    conn: asyncpg.Connection, *, teacher_id: UUID, user_id: UUID, rating: int
) -> None:
    await conn.execute(
        """
        INSERT INTO public.teacher_ratings (teacher_id, user_id, rating)
        VALUES ($1, $2, $3)
        ON CONFLICT (teacher_id, user_id)
        DO UPDATE SET rating = EXCLUDED.rating, updated_at = now()
        """,
        teacher_id,
        user_id,
        rating,
    )


async def get_user_rating(
    conn: asyncpg.Connection, *, teacher_id: UUID, user_id: UUID
) -> Optional[int]:
    val = await conn.fetchval(
        "SELECT rating FROM public.teacher_ratings WHERE teacher_id = $1 AND user_id = $2",
        teacher_id,
        user_id,
    )
    return int(val) if val is not None else None


async def get_aggregates(
    conn: asyncpg.Connection, *, teacher_id: UUID
) -> tuple[int, Optional[float]]:
    row = await conn.fetchrow(
        """
        SELECT
            COUNT(*)::int                       AS cnt,
            ROUND(AVG(rating::numeric), 2)::float AS avg
        FROM public.teacher_ratings
        WHERE teacher_id = $1
        """,
        teacher_id,
    )
    if row is None:
        return 0, None
    return int(row["cnt"] or 0), row["avg"]


def teacher_ids_from_records(rows: Sequence[asyncpg.Record]) -> List[UUID]:
    return [r["id"] for r in rows]
