from secrets import token_urlsafe

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Request, Response
from pydantic import BaseModel
from jwt import PyJWTError
from sqlalchemy.orm import Session

from app.infrastructure.security import CsrfTokenService
from app.application.auth.password_policy import PasswordPolicyError
from app.application.auth.ports import UserRecord
from app.application.auth.use_cases import AuthError, AuthTokens, AuthUseCases
from app.bootstrap.container import build_auth_use_cases
from app.infrastructure.config import get_settings
from app.infrastructure.db.session import get_db_session
from app.presentation.api.cookies import delete_auth_cookie, set_auth_cookie, set_session_cookie
from app.presentation.api.dependencies import get_current_user, require_admin_user, validate_csrf_token

router = APIRouter()


class CsrfTokenResponse(BaseModel):
    csrf_token: str


class UserResponse(BaseModel):
    user_id: str
    email: str
    is_admin: bool


class CreateUserRequest(BaseModel):
    email: str
    password: str
    is_admin: bool = False


class LoginRequest(BaseModel):
    email: str
    password: str


class PasswordResetStartRequest(BaseModel):
    email: str


class PasswordResetStartResponse(BaseModel):
    status: str
    reset_token: str | None


class PasswordResetConfirmRequest(BaseModel):
    reset_token: str
    new_password: str


@router.get("/csrf", response_model=CsrfTokenResponse)
def get_csrf_token(request: Request, response: Response) -> CsrfTokenResponse:
    settings = get_settings()
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    csrf_session = request.cookies.get(settings.csrf_session_cookie_name)
    if not csrf_session:
        csrf_session = token_urlsafe(32)
        set_session_cookie(response, settings.csrf_session_cookie_name, csrf_session, settings)
    service = CsrfTokenService(secret_key=settings.jwt_secret, ttl_minutes=settings.csrf_token_minutes)
    return CsrfTokenResponse(csrf_token=service.issue_token(session_binding=csrf_session))


@router.post("/bootstrap-admin", response_model=UserResponse, dependencies=[Depends(validate_csrf_token)])
def bootstrap_admin(
    request: CreateUserRequest,
    setup_token: str | None = Header(default=None, alias="X-Admin-Setup-Token"),
    session: Session = Depends(get_db_session),
) -> UserResponse:
    settings = get_settings()
    if not settings.admin_setup_token or setup_token != settings.admin_setup_token:
        raise HTTPException(status_code=403, detail="Admin setup token is invalid.")
    try:
        user = _use_cases(session).bootstrap_admin(email=request.email, password=request.password)
    except (AuthError, PasswordPolicyError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _user_response(user)


@router.post("/admin/users", response_model=UserResponse, dependencies=[Depends(validate_csrf_token)])
def create_user(
    request: CreateUserRequest,
    admin_user: UserRecord = Depends(require_admin_user),
    session: Session = Depends(get_db_session),
) -> UserResponse:
    try:
        user = _use_cases(session).create_user_by_admin(
            admin_user=admin_user,
            email=request.email,
            password=request.password,
            is_admin=request.is_admin,
        )
    except (AuthError, PasswordPolicyError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _user_response(user)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: UserRecord = Depends(get_current_user)) -> UserResponse:
    return _user_response(current_user)


@router.post("/login", response_model=UserResponse, dependencies=[Depends(validate_csrf_token)])
def login(request: LoginRequest, response: Response, session: Session = Depends(get_db_session)) -> UserResponse:
    try:
        user, tokens = _use_cases(session).login(email=request.email, password=request.password)
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    _set_auth_cookies(response, tokens)
    return _user_response(user)


@router.post("/refresh", dependencies=[Depends(validate_csrf_token)])
def refresh(
    response: Response,
    kakeibo_refresh: str | None = Cookie(default=None),
    session: Session = Depends(get_db_session),
) -> dict[str, str]:
    if not kakeibo_refresh:
        raise HTTPException(status_code=401, detail="Refresh token is required.")
    try:
        tokens = _use_cases(session).refresh(refresh_token=kakeibo_refresh)
    except (AuthError, PyJWTError) as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    _set_auth_cookies(response, tokens)
    return {"status": "ok"}


@router.post("/logout", dependencies=[Depends(validate_csrf_token)])
def logout(
    response: Response,
    kakeibo_refresh: str | None = Cookie(default=None),
    session: Session = Depends(get_db_session),
) -> dict[str, str]:
    _use_cases(session).logout(refresh_token=kakeibo_refresh)
    settings = get_settings()
    delete_auth_cookie(response, settings.access_cookie_name, settings)
    delete_auth_cookie(response, settings.refresh_cookie_name, settings)
    return {"status": "ok"}


@router.post("/password-reset", response_model=PasswordResetStartResponse, dependencies=[Depends(validate_csrf_token)])
def start_password_reset(
    request: PasswordResetStartRequest,
    session: Session = Depends(get_db_session),
) -> PasswordResetStartResponse:
    settings = get_settings()
    reset_token = _use_cases(session).start_password_reset(email=request.email)
    return PasswordResetStartResponse(
        status="ok",
        reset_token=reset_token if settings.app_env in {"local", "test"} else None,
    )


@router.post("/password-reset/confirm", dependencies=[Depends(validate_csrf_token)])
def confirm_password_reset(
    request: PasswordResetConfirmRequest,
    session: Session = Depends(get_db_session),
) -> dict[str, str]:
    try:
        _use_cases(session).confirm_password_reset(reset_token=request.reset_token, new_password=request.new_password)
    except (AuthError, PasswordPolicyError, PyJWTError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"status": "ok"}


def _use_cases(session: Session) -> AuthUseCases:
    return build_auth_use_cases(session)


def _set_auth_cookies(response: Response, tokens: AuthTokens) -> None:
    settings = get_settings()
    set_auth_cookie(
        response,
        settings.access_cookie_name,
        tokens.access_token,
        tokens.access_max_age_seconds,
        settings,
    )
    set_auth_cookie(
        response,
        settings.refresh_cookie_name,
        tokens.refresh_token,
        tokens.refresh_max_age_seconds,
        settings,
    )


def _user_response(user: UserRecord) -> UserResponse:
    return UserResponse(user_id=str(user.id), email=user.email, is_admin=user.is_admin)
