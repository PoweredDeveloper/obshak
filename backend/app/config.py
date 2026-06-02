"""Runtime configuration loaded from environment via pydantic-settings."""

from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )

    database_url: str = Field(
        default="postgres://postgres:postgres@host.docker.internal:54322/postgres",
        description="Postgres DSN. asyncpg-compatible.",
    )
    supabase_url: str = Field(
        default="",
        description="Public Supabase API base (e.g. https://obshak.space). Used for GET /auth/v1/user token check.",
    )
    supabase_publishable_key: str = Field(
        default="",
        description="Supabase anon/publishable key (apikey header). Same as frontend VITE_SUPABASE_PUBLISHABLE_KEY.",
    )
    supabase_jwt_secret: str = Field(
        default="",
        description="HS256 JWT secret. Used only if supabase_url+publishable_key unset (local dev).",
    )
    supabase_jwt_audience: str = Field(
        default="authenticated",
        description="Expected `aud` claim value (JWT path only).",
    )
    telegram_bot_token: str = Field(
        default="",
        description="Bot token used to verify Telegram initData / Login Widget signatures.",
    )
    # Comma-separated string in env; expose parsed list via `cors_origins`.
    cors_origins_raw: str = Field(
        default="http://localhost:8080,http://localhost:5173",
        alias="CORS_ORIGINS",
    )
    log_level: str = Field(default="INFO")
    pool_min_size: int = Field(default=1)
    pool_max_size: int = Field(default=10)
    request_timeout_seconds: float = Field(default=15.0)

    @property
    def cors_origins(self) -> List[str]:
        return [s.strip() for s in self.cors_origins_raw.split(",") if s.strip()]

    @field_validator("database_url", mode="after")
    @classmethod
    def _normalize_dsn(cls, v: str) -> str:
        # asyncpg accepts both postgres:// and postgresql://; normalize
        if v.startswith("postgresql+asyncpg://"):
            return "postgres://" + v[len("postgresql+asyncpg://") :]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
