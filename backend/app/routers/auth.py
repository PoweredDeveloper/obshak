"""Telegram auth (validation only, for now).

Issuing native JWTs from this service is intentionally **not** wired up yet —
the frontend currently obtains a Supabase access token via the existing Edge
Function and we verify it here. This endpoint is exposed so the validation
logic is reachable from CI/manual tests and forms the basis for a future
session flow.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.config import get_settings
from app.schemas.auth import TelegramAuthAck, TelegramAuthRequest
from app.security import AuthError, validate_init_data, validate_login_widget

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/telegram/validate",
    response_model=TelegramAuthAck,
    summary="Validate Telegram initData / Login Widget signatures (no token issued)",
)
async def telegram_validate(payload: TelegramAuthRequest) -> TelegramAuthAck:
    settings = get_settings()
    if not settings.telegram_bot_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="TELEGRAM_BOT_TOKEN is not configured",
        )

    try:
        if payload.init_data:
            validate_init_data(payload.init_data, settings.telegram_bot_token)
        else:
            assert payload.login_widget is not None
            validate_login_widget(payload.login_widget, settings.telegram_bot_token)
    except AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    return TelegramAuthAck(detail="Telegram payload signature is valid")
