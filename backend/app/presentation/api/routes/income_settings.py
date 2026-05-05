from __future__ import annotations

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.application.auth.ports import UserRecord
from app.bootstrap.container import build_income_settings_use_cases
from app.application.income_settings import (
    IncomeOverride,
    IncomeOverrideCommand,
    IncomeSetting,
    IncomeSettingCommand,
    IncomeSettingsError,
    IncomeSettingsUseCases,
)
from app.infrastructure.db.session import get_db_session
from app.presentation.api.dependencies import get_current_user, validate_csrf_token

router = APIRouter()


class IncomeOverrideResponse(BaseModel):
    override_id: str
    target_month: date
    amount: int
    day: int


class IncomeSettingResponse(BaseModel):
    income_setting_id: str
    member_name: str
    category_id: str
    base_amount: int
    base_day: int
    overrides: list[IncomeOverrideResponse]


class IncomeSettingRequest(BaseModel):
    member_name: str = Field(min_length=1, max_length=100)
    category_id: UUID
    base_amount: int = Field(ge=0)
    base_day: int = Field(ge=1, le=31)


class IncomeOverrideRequest(BaseModel):
    amount: int = Field(ge=0)
    day: int = Field(ge=1, le=31)


@router.get("", response_model=list[IncomeSettingResponse])
def list_income_settings(
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> list[IncomeSettingResponse]:
    settings = _use_cases(session).list_settings(user_id=current_user.id)
    return [_setting_response(setting) for setting in settings]


@router.post("", response_model=IncomeSettingResponse, dependencies=[Depends(validate_csrf_token)])
def create_income_setting(
    request: IncomeSettingRequest,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> IncomeSettingResponse:
    try:
        setting = _use_cases(session).create_setting(user_id=current_user.id, command=_setting_command(request))
    except IncomeSettingsError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _setting_response(setting)


@router.put("/{income_setting_id}", response_model=IncomeSettingResponse, dependencies=[Depends(validate_csrf_token)])
def update_income_setting(
    income_setting_id: UUID,
    request: IncomeSettingRequest,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> IncomeSettingResponse:
    try:
        setting = _use_cases(session).update_setting(
            user_id=current_user.id,
            income_setting_id=income_setting_id,
            command=_setting_command(request),
        )
    except IncomeSettingsError as exc:
        raise HTTPException(status_code=404 if "not found" in str(exc).lower() else 400, detail=str(exc)) from exc
    return _setting_response(setting)


@router.delete("/{income_setting_id}", dependencies=[Depends(validate_csrf_token)])
def delete_income_setting(
    income_setting_id: UUID,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict[str, str]:
    try:
        _use_cases(session).delete_setting(user_id=current_user.id, income_setting_id=income_setting_id)
    except IncomeSettingsError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"status": "ok"}


@router.put("/{income_setting_id}/overrides/{target_month}", response_model=IncomeSettingResponse, dependencies=[Depends(validate_csrf_token)])
def upsert_income_override(
    income_setting_id: UUID,
    target_month: str,
    request: IncomeOverrideRequest,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> IncomeSettingResponse:
    try:
        setting = _use_cases(session).upsert_override(
            user_id=current_user.id,
            income_setting_id=income_setting_id,
            command=IncomeOverrideCommand(target_month=_parse_target_month(target_month), amount=request.amount, day=request.day),
        )
    except IncomeSettingsError as exc:
        raise HTTPException(status_code=404 if "not found" in str(exc).lower() else 400, detail=str(exc)) from exc
    return _setting_response(setting)


@router.delete("/{income_setting_id}/overrides/{target_month}", response_model=IncomeSettingResponse, dependencies=[Depends(validate_csrf_token)])
def delete_income_override(
    income_setting_id: UUID,
    target_month: str,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> IncomeSettingResponse:
    try:
        setting = _use_cases(session).delete_override(
            user_id=current_user.id,
            income_setting_id=income_setting_id,
            target_month=_parse_target_month(target_month),
        )
    except IncomeSettingsError as exc:
        raise HTTPException(status_code=404 if "not found" in str(exc).lower() else 400, detail=str(exc)) from exc
    return _setting_response(setting)


def apply_due_income_transactions(*, user_id: UUID, session: Session) -> int:
    return _use_cases(session).apply_due_transactions(user_id=user_id)


def _use_cases(session: Session) -> IncomeSettingsUseCases:
    return build_income_settings_use_cases(session)


def _setting_command(request: IncomeSettingRequest) -> IncomeSettingCommand:
    return IncomeSettingCommand(
        member_name=request.member_name,
        category_id=request.category_id,
        base_amount=request.base_amount,
        base_day=request.base_day,
    )


def _parse_target_month(value: str) -> date:
    try:
        year, month = value.split("-", maxsplit=1)
        return date(int(year), int(month), 1)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="target_month must be YYYY-MM.") from exc


def _setting_response(setting: IncomeSetting) -> IncomeSettingResponse:
    return IncomeSettingResponse(
        income_setting_id=str(setting.income_setting_id),
        member_name=setting.member_name,
        category_id=str(setting.category_id),
        base_amount=setting.base_amount,
        base_day=setting.base_day,
        overrides=[_override_response(override) for override in setting.overrides],
    )


def _override_response(override: IncomeOverride) -> IncomeOverrideResponse:
    return IncomeOverrideResponse(
        override_id=str(override.override_id),
        target_month=override.target_month,
        amount=override.amount,
        day=override.day,
    )
