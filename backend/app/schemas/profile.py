"""Profile schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class Profile(BaseModel):
    id: UUID
    telegram_id: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    group_id: Optional[str] = None
    group_name: Optional[str] = None
    institute: Optional[str] = None
    course: Optional[int] = None
    semester: Optional[int] = None
    onboarded: Optional[bool] = None
    last_active: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class Me(BaseModel):
    profile: Profile
    is_admin: bool = False
