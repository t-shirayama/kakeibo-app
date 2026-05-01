from __future__ import annotations

from fastapi import Header, HTTPException

from app.application.auth.csrf_service import CsrfTokenError, CsrfTokenService
from app.infrastructure.config import get_settings


def validate_csrf_token(x_csrf_token: str | None = Header(default=None, alias="X-CSRF-Token")) -> None:
    if not x_csrf_token:
        raise HTTPException(status_code=403, detail="CSRF token is required.")

    settings = get_settings()
    service = CsrfTokenService(secret_key=settings.jwt_secret, ttl_minutes=settings.csrf_token_minutes)
    try:
        service.validate_token(x_csrf_token)
    except CsrfTokenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
