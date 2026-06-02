"""Marketplace `services` (read-only for now)."""

from __future__ import annotations

from typing import List, Optional
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.db import services as q
from app.deps import get_db_conn
from app.schemas.common import Page
from app.schemas.service import Service, ServiceCategory, ServiceReview, ServiceReviewProfile

router = APIRouter(prefix="/services", tags=["services"])


def _row_to_service(row: asyncpg.Record) -> Service:
    data = dict(row)
    if data.get("author_rating") is not None:
        data["author_rating"] = float(data["author_rating"])
    return Service(**data)


def _row_to_review(row: asyncpg.Record) -> ServiceReview:
    profile = None
    if row["first_name"] or row["last_name"] or row["group_name"]:
        profile = ServiceReviewProfile(
            first_name=row["first_name"],
            last_name=row["last_name"],
            group_name=row["group_name"],
        )
    return ServiceReview(
        id=row["id"],
        service_id=row["service_id"],
        user_id=row["user_id"],
        rating=int(row["rating"]),
        comment=row["comment"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        profile=profile,
    )


@router.get(
    "/categories",
    response_model=List[ServiceCategory],
    summary="List service categories",
)
async def list_categories(
    conn: asyncpg.Connection = Depends(get_db_conn),
) -> List[ServiceCategory]:
    rows = await q.list_categories(conn)
    return [ServiceCategory(**dict(r)) for r in rows]


@router.get("", response_model=Page[Service], summary="List active services")
async def list_services(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    category_id: Optional[UUID] = Query(None),
    search: str = Query("", max_length=200),
    conn: asyncpg.Connection = Depends(get_db_conn),
) -> Page[Service]:
    rows, total = await q.list_services(
        conn,
        limit=limit,
        offset=offset,
        category_id=category_id,
        search=search.strip(),
    )
    items = [_row_to_service(r) for r in rows]
    return Page[Service](items=items, total=total, has_more=offset + limit < total)


@router.get("/{service_id}", response_model=Service, summary="Get a single service")
async def get_service(
    service_id: UUID,
    conn: asyncpg.Connection = Depends(get_db_conn),
) -> Service:
    row = await q.get_service(conn, service_id=service_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    return _row_to_service(row)


@router.get(
    "/{service_id}/reviews",
    response_model=Page[ServiceReview],
    summary="List reviews for a service",
)
async def list_reviews(
    service_id: UUID,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    conn: asyncpg.Connection = Depends(get_db_conn),
) -> Page[ServiceReview]:
    rows, total = await q.list_reviews(
        conn, service_id=service_id, limit=limit, offset=offset
    )
    items = [_row_to_review(r) for r in rows]
    return Page[ServiceReview](items=items, total=total, has_more=offset + limit < total)
