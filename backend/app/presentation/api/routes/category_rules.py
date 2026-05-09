from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.application.auth.ports import UserRecord
from app.application.category_rules import CategoryRuleCommand, CategoryRuleError, CategoryRuleUseCases
from app.bootstrap.container import build_category_rule_use_cases
from app.domain.entities import TransactionCategoryRule
from app.infrastructure.db.session import get_db_session
from app.presentation.api.dependencies import get_current_user, validate_csrf_token
from app.presentation.api.errors import http_exception_from_application_error

router = APIRouter()


class CategoryRuleResponse(BaseModel):
    rule_id: str
    keyword: str
    category_id: str
    is_active: bool


class CategoryRuleRequest(BaseModel):
    keyword: str = Field(min_length=1, max_length=255)
    category_id: UUID


class CategoryRuleStatusRequest(BaseModel):
    is_active: bool


@router.get("", response_model=list[CategoryRuleResponse])
def list_category_rules(
    include_inactive: bool = False,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> list[CategoryRuleResponse]:
    rules = _use_cases(session).list_rules(user_id=current_user.id, include_inactive=include_inactive)
    return [_category_rule_response(rule) for rule in rules]


@router.post("", response_model=CategoryRuleResponse, dependencies=[Depends(validate_csrf_token)])
def create_category_rule(
    request: CategoryRuleRequest,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> CategoryRuleResponse:
    try:
        rule = _use_cases(session).create_rule(
            user_id=current_user.id,
            command=CategoryRuleCommand(keyword=request.keyword, category_id=request.category_id),
        )
    except CategoryRuleError as exc:
        raise http_exception_from_application_error(exc) from exc
    return _category_rule_response(rule)


@router.put("/{rule_id}", response_model=CategoryRuleResponse, dependencies=[Depends(validate_csrf_token)])
def update_category_rule(
    rule_id: UUID,
    request: CategoryRuleRequest,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> CategoryRuleResponse:
    try:
        rule = _use_cases(session).update_rule(
            user_id=current_user.id,
            rule_id=rule_id,
            command=CategoryRuleCommand(keyword=request.keyword, category_id=request.category_id),
        )
    except CategoryRuleError as exc:
        raise http_exception_from_application_error(exc) from exc
    return _category_rule_response(rule)


@router.patch("/{rule_id}/status", response_model=CategoryRuleResponse, dependencies=[Depends(validate_csrf_token)])
def set_category_rule_status(
    rule_id: UUID,
    request: CategoryRuleStatusRequest,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> CategoryRuleResponse:
    try:
        rule = _use_cases(session).set_rule_active(
            user_id=current_user.id,
            rule_id=rule_id,
            is_active=request.is_active,
        )
    except CategoryRuleError as exc:
        raise http_exception_from_application_error(exc) from exc
    return _category_rule_response(rule)


@router.delete("/{rule_id}", dependencies=[Depends(validate_csrf_token)])
def delete_category_rule(
    rule_id: UUID,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict[str, str]:
    try:
        _use_cases(session).delete_rule(user_id=current_user.id, rule_id=rule_id)
    except CategoryRuleError as exc:
        raise http_exception_from_application_error(exc) from exc
    return {"status": "ok"}


def _use_cases(session: Session) -> CategoryRuleUseCases:
    return build_category_rule_use_cases(session)


def _category_rule_response(rule: TransactionCategoryRule) -> CategoryRuleResponse:
    return CategoryRuleResponse(
        rule_id=str(rule.id),
        keyword=rule.keyword,
        category_id=str(rule.category_id),
        is_active=rule.is_active,
    )
