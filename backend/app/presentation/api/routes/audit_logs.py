from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.application.audit_logs import AuditLogEntry, AuditLogUseCases
from app.application.auth.ports import UserRecord
from app.application.common import Page, PageResult
from app.infrastructure.db.session import get_db_session
from app.presentation.api.dependencies import get_current_user
from app.presentation.api.service_factories import build_audit_log_use_cases

router = APIRouter()


class AuditLogEntryResponse(BaseModel):
    audit_log_id: str
    user_id: str
    user_email: str
    action: str
    resource_type: str
    resource_id: str
    details: dict[str, object]
    created_at: str


class AuditLogListResponse(BaseModel):
    items: list[AuditLogEntryResponse]
    total: int
    page: int
    page_size: int


@router.get("", response_model=AuditLogListResponse)
def list_audit_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    action: str | None = Query(default=None),
    resource_type: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> AuditLogListResponse:
    result = _use_cases(session).list_audit_logs(
        user_id=current_user.id,
        page=Page(page=page, page_size=page_size),
        action=action,
        resource_type=resource_type,
        date_from=date_from,
        date_to=date_to,
    )
    return _response(result)


def _use_cases(session: Session) -> AuditLogUseCases:
    return build_audit_log_use_cases(session)


def _response(result: PageResult[AuditLogEntry]) -> AuditLogListResponse:
    return AuditLogListResponse(
        items=[
            AuditLogEntryResponse(
                audit_log_id=str(item.audit_log_id),
                user_id=str(item.user_id),
                user_email=item.user_email,
                action=item.action,
                resource_type=item.resource_type,
                resource_id=item.resource_id,
                details=item.details,
                created_at=item.created_at,
            )
            for item in result.items
        ],
        total=result.total,
        page=result.page,
        page_size=result.page_size,
    )
