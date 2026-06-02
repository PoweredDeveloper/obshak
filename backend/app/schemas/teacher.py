"""Teacher schemas."""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class Teacher(BaseModel):
    id: UUID
    full_name: str
    department: Optional[str] = None
    email: Optional[str] = None
    average_rating: Optional[float] = Field(default=None, ge=0, le=5)
    ratings_count: int = Field(default=0, ge=0)
    user_rating: Optional[int] = Field(default=None, ge=1, le=5)


class RateTeacherRequest(BaseModel):
    rating: int = Field(ge=1, le=5)

    @field_validator("rating")
    @classmethod
    def _coerce(cls, v: int) -> int:
        return int(v)


class RateTeacherResponse(BaseModel):
    teacher_id: UUID
    user_rating: int
    average_rating: Optional[float]
    ratings_count: int
