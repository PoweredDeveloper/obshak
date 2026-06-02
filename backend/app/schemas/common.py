"""Shared response building blocks."""

from __future__ import annotations

from typing import Generic, List, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: List[T]
    total: int = Field(ge=0)
    has_more: bool


class ErrorResponse(BaseModel):
    detail: str
