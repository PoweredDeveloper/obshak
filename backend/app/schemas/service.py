"""Marketplace `services` schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ServiceCategory(BaseModel):
    id: UUID
    name: str
    icon: Optional[str] = None


class Service(BaseModel):
    id: UUID
    title: str
    description: str
    price: int
    category_id: Optional[UUID] = None
    author_id: Optional[UUID] = None
    author_name: str
    author_username: Optional[str] = None
    author_rating: Optional[float] = None
    reviews_count: int = Field(default=0, ge=0)
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class ServiceReviewProfile(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    group_name: Optional[str] = None


class ServiceReview(BaseModel):
    id: UUID
    service_id: UUID
    user_id: Optional[UUID]
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    profile: Optional[ServiceReviewProfile] = None
