"""FastAPI entry point."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any, Dict

import orjson
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse, JSONResponse

from app.config import get_settings
from app.db import close_pool, init_pool
from app.routers import admin_metrics, auth, health, profiles, services, teachers

logger = logging.getLogger("obshak.api")

OPENAPI_TAGS = [
    {"name": "meta", "description": "Health probes."},
    {"name": "auth", "description": "Telegram signature validation."},
    {"name": "profile", "description": "The current authenticated user."},
    {"name": "teachers", "description": "Teacher catalog and per-user ratings."},
    {"name": "services", "description": "Student marketplace services and reviews."},
    {"name": "admin", "description": "Admin-only dashboards (requires `admins.telegram_id`)."},
]


def _configure_logging(level: str) -> None:
    logging.basicConfig(
        level=level.upper(),
        format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
    )


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    _configure_logging(settings.log_level)
    logger.info("Starting Obshak API")
    await init_pool()
    try:
        yield
    finally:
        await close_pool()
        logger.info("Obshak API stopped")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Obshak API",
        version="0.1.0",
        summary="Public HTTP API for Obshak (api.obshak.space).",
        description=(
            "Authenticate by sending the Supabase access token as a Bearer "
            "credential. Click **Authorize** on Swagger to set the header.\n\n"
            "Open endpoints (no auth) are also available — they will simply "
            "return public data and skip user-specific fields."
        ),
        openapi_tags=OPENAPI_TAGS,
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error: %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"},
        )

    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(profiles.router)
    app.include_router(teachers.router)
    app.include_router(services.router)
    app.include_router(admin_metrics.router)

    _attach_openapi_security(app)
    return app


def _attach_openapi_security(app: FastAPI) -> None:
    """Add a Bearer security scheme that applies to every route by default.

    Endpoints that allow anonymous access will simply ignore an absent token,
    but Swagger's "Authorize" button now sets the header for all "Try it out"
    invocations — which is what users expect from production-grade APIs.
    """

    base_openapi = app.openapi

    def custom_openapi() -> Dict[str, Any]:
        if app.openapi_schema:
            return app.openapi_schema
        schema = base_openapi()
        components = schema.setdefault("components", {})
        security = components.setdefault("securitySchemes", {})
        security["BearerAuth"] = {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Paste the Supabase access token.",
        }
        schema["security"] = [{"BearerAuth": []}]
        app.openapi_schema = schema
        return schema

    app.openapi = custom_openapi  # type: ignore[assignment]


app = create_app()


__all__ = ["app", "create_app", "orjson"]
