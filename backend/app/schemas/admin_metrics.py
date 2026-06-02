"""Admin dashboard metrics (matches frontend `UserStats`)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class InstituteBucket(BaseModel):
    institute: str
    count: int = Field(ge=0)


class GroupBucket(BaseModel):
    group_name: str
    count: int = Field(ge=0)


class UserStats(BaseModel):
    totalUsers: int = Field(ge=0)
    newUsersToday: int = Field(ge=0)
    activeToday: int = Field(ge=0)
    activeWeek: int = Field(ge=0)
    activeMonth: int = Field(ge=0)
    day1RetentionPct: float = Field(ge=0)
    week1RetentionPct: float = Field(ge=0)
    blockedUsers: int = Field(ge=0)
    blockedUsersPct: float = Field(ge=0)
    unrecognizedRequests: int = Field(ge=0)
    botCrashes: int = Field(ge=0)
    byInstitute: list[InstituteBucket]
    byGroup: list[GroupBucket]
