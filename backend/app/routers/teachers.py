"""Teachers + ratings."""

from __future__ import annotations

from typing import Optional
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.db import teachers as q
from app.deps import get_current_identity, get_db_conn, get_optional_identity
from app.schemas.common import Page
from app.schemas.teacher import RateTeacherRequest, RateTeacherResponse, Teacher
from app.security import AuthIdentity

router = APIRouter(prefix="/teachers", tags=["teachers"])


def _row_to_teacher(row: asyncpg.Record) -> Teacher:
    avg = row["average_rating"]
    return Teacher(
        id=row["id"],
        full_name=row["full_name"],
        department=row["department"],
        email=row["email"],
        average_rating=float(avg) if avg is not None else None,
        ratings_count=int(row["ratings_count"] or 0),
        user_rating=row["user_rating"],
    )


@router.get(
    "",
    response_model=Page[Teacher],
    summary="List teachers (with live aggregates and the caller's rating)",
)
async def list_teachers(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: str = Query("", max_length=200),
    sort_by: str = Query("rating", pattern="^(rating|name)$"),
    identity: Optional[AuthIdentity] = Depends(get_optional_identity),
    conn: asyncpg.Connection = Depends(get_db_conn),
) -> Page[Teacher]:
    user_id = identity.user_id if identity else None
    rows, total = await q.list_teachers(
        conn,
        user_id=user_id,
        limit=limit,
        offset=offset,
        search=search.strip(),
        sort_by=sort_by,
    )
    items = [_row_to_teacher(r) for r in rows]
    return Page[Teacher](items=items, total=total, has_more=offset + limit < total)


@router.get("/{teacher_id}", response_model=Teacher, summary="Get a single teacher")
async def get_teacher(
    teacher_id: UUID,
    identity: Optional[AuthIdentity] = Depends(get_optional_identity),
    conn: asyncpg.Connection = Depends(get_db_conn),
) -> Teacher:
    user_id = identity.user_id if identity else None
    row = await q.get_teacher(conn, teacher_id=teacher_id, user_id=user_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
    return _row_to_teacher(row)


@router.put(
    "/{teacher_id}/rating",
    response_model=RateTeacherResponse,
    summary="Rate a teacher (upsert). Requires authentication.",
)
async def rate_teacher(
    teacher_id: UUID,
    body: RateTeacherRequest,
    identity: AuthIdentity = Depends(get_current_identity),
    conn: asyncpg.Connection = Depends(get_db_conn),
) -> RateTeacherResponse:
    async with conn.transaction():
        await q.upsert_rating(
            conn,
            teacher_id=teacher_id,
            user_id=identity.user_id,
            rating=body.rating,
        )
        cnt, avg = await q.get_aggregates(conn, teacher_id=teacher_id)
    return RateTeacherResponse(
        teacher_id=teacher_id,
        user_rating=body.rating,
        average_rating=float(avg) if avg is not None else None,
        ratings_count=cnt,
    )
