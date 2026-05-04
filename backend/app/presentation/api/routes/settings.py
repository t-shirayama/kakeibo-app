from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.application.auth.ports import UserRecord
from app.application.reports import ReportUseCases
from app.application.settings import SettingsError, SettingsUseCases, UpdateSettingsCommand
from app.infrastructure.config import get_settings
from app.infrastructure.db.session import get_db_session
from app.infrastructure.repositories.settings import SettingsRepository, UserSettingsRecord
from app.infrastructure.storage import LocalUploadStorage
from app.presentation.api.cookies import delete_auth_cookie
from app.presentation.api.dependencies import get_current_user, validate_csrf_token
from app.presentation.api.service_factories import build_report_use_cases

router = APIRouter()


class SettingsResponse(BaseModel):
    user_id: str
    currency: str
    timezone: str
    date_format: str
    page_size: int
    dark_mode: bool


class UpdateSettingsRequest(BaseModel):
    page_size: int = Field(ge=1, le=100)
    date_format: str = "yyyy/MM/dd"
    dark_mode: bool = False


class DeleteDataRequest(BaseModel):
    confirmation_text: str | None = None
    password: str | None = None


@router.get("", response_model=SettingsResponse)
def get_user_settings(
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> SettingsResponse:
    return _settings_response(_use_cases(session).get_settings(current_user.id))


@router.put("", response_model=SettingsResponse, dependencies=[Depends(validate_csrf_token)])
def update_user_settings(
    request: UpdateSettingsRequest,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> SettingsResponse:
    try:
        settings = _use_cases(session).update_settings(
            user_id=current_user.id,
            command=UpdateSettingsCommand(
                page_size=request.page_size,
                date_format=request.date_format,
                dark_mode=request.dark_mode,
            ),
        )
    except SettingsError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _settings_response(settings)


@router.post("/export", dependencies=[Depends(validate_csrf_token)])
def export_user_data(
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> Response:
    content = build_report_use_cases(session).export_workbook(user_id=current_user.id)
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="kakeibo-export.xlsx"'},
    )


@router.delete("/data", dependencies=[Depends(validate_csrf_token)])
def delete_all_user_data(
    request: DeleteDataRequest,
    response: Response,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict[str, str]:
    try:
        _use_cases(session).delete_all_user_data(
            current_user=current_user,
            confirmation_text=request.confirmation_text,
            password=request.password,
        )
    except SettingsError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    settings = get_settings()
    delete_auth_cookie(response, settings.access_cookie_name, settings)
    delete_auth_cookie(response, settings.refresh_cookie_name, settings)
    return {"status": "ok"}


def _use_cases(session: Session) -> SettingsUseCases:
    settings = get_settings()
    return SettingsUseCases(
        repository=SettingsRepository(session),
        storage=LocalUploadStorage(settings.upload_storage_root),
    )


def _settings_response(settings: UserSettingsRecord) -> SettingsResponse:
    return SettingsResponse(
        user_id=str(settings.user_id),
        currency=settings.currency,
        timezone=settings.timezone,
        date_format=settings.date_format,
        page_size=settings.page_size,
        dark_mode=settings.dark_mode,
    )
