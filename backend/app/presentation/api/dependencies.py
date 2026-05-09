from __future__ import annotations

from uuid import UUID

from fastapi import Cookie, Depends, Header, HTTPException, Request
from jwt import PyJWTError
from sqlalchemy.orm import Session

from app.application.auth.ports import UserRecord
from app.infrastructure.config import get_settings
from app.infrastructure.db.session import get_db_session
from app.infrastructure.repositories.auth import AuthRepository
from app.infrastructure.security import CsrfTokenError, CsrfTokenService, JwtService


def validate_csrf_token(
    request: Request,
    x_csrf_token: str | None = Header(default=None, alias="X-CSRF-Token"),
) -> None:
    if not x_csrf_token:
        raise HTTPException(status_code=403, detail="CSRF token is required.")

    settings = get_settings()
    csrf_session = request.cookies.get(settings.csrf_session_cookie_name)
    if not csrf_session:
        raise HTTPException(status_code=403, detail="CSRF session is required.")
    service = CsrfTokenService(secret_key=settings.jwt_secret, ttl_minutes=settings.csrf_token_minutes)
    try:
        service.validate_token(x_csrf_token, session_binding=csrf_session)
    except CsrfTokenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


def get_current_user(
    kakeibo_access: str | None = Cookie(default=None),
    session: Session = Depends(get_db_session),
) -> UserRecord:
    if not kakeibo_access:
        raise HTTPException(status_code=401, detail="Authentication is required.")

    settings = get_settings()
    try:
        payload = JwtService(settings).decode(kakeibo_access)
    except PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Access token is invalid.") from exc

    if payload.get("typ") != "access":
        raise HTTPException(status_code=401, detail="Access token type is invalid.")

    user = AuthRepository(session).get_active_user_by_id(UUID(str(payload["sub"])))
    if user is None:
        raise HTTPException(status_code=401, detail="User does not exist.")
    return user


def require_admin_user(current_user: UserRecord = Depends(get_current_user)) -> UserRecord:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges are required.")
    return current_user


def ensure_owner(resource_user_id: UUID, current_user: UserRecord) -> None:
    if resource_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this resource.")
