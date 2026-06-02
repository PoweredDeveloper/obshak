"""Auth schemas (placeholder for future native Telegram auth flow)."""

from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, model_validator


class TelegramAuthRequest(BaseModel):
    init_data: Optional[str] = None
    login_widget: Optional[Dict[str, Any]] = None

    @model_validator(mode="after")
    def _exactly_one(self) -> "TelegramAuthRequest":
        if bool(self.init_data) == bool(self.login_widget):
            raise ValueError("Provide exactly one of init_data or login_widget")
        return self


class TelegramAuthAck(BaseModel):
    """Returned while the native FastAPI session flow is still under construction.

    Today the frontend should keep calling Supabase Auth's Telegram Edge Function
    and pass the resulting access token to this API.
    """

    ok: bool = True
    detail: str
