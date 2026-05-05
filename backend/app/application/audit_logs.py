from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Protocol
from uuid import UUID

from app.application.common import Page, PageResult


@dataclass(frozen=True, slots=True)
class AuditLogEntry:
    audit_log_id: UUID
    user_id: UUID
    user_email: str
    action: str
    resource_type: str
    resource_id: str
    details: dict[str, object]
    created_at: str


class AuditLogQueryRepositoryProtocol(Protocol):
    def list_audit_logs(
        self,
        *,
        user_id: UUID,
        page: Page,
        action: str | None = None,
        resource_type: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> PageResult[AuditLogEntry]:
        raise NotImplementedError


class AuditLogUseCases:
    # 監査ログは参照専用とし、一覧取得の条件整理だけをユースケースで扱う。
    def __init__(self, repository: AuditLogQueryRepositoryProtocol) -> None:
        self._repository = repository

    def list_audit_logs(
        self,
        *,
        user_id: UUID,
        page: Page,
        action: str | None = None,
        resource_type: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> PageResult[AuditLogEntry]:
        return self._repository.list_audit_logs(
            user_id=user_id,
            page=page,
            action=action,
            resource_type=resource_type,
            date_from=date_from,
            date_to=date_to,
        )
