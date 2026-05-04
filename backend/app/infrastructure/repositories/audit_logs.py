from __future__ import annotations

from datetime import UTC, date, datetime, time
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.application.audit_logs import AuditLogEntry
from app.application.common import Page, PageResult
from app.infrastructure.models.audit_log import AuditLogModel
from app.infrastructure.models.user import UserModel


class AuditLogQueryRepository:
    # 監査ログの一覧参照だけを担当し、書き込み責務とは分離する。
    def __init__(self, session: Session) -> None:
        self._session = session

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
        filters = [AuditLogModel.user_id == str(user_id)]
        if action:
            filters.append(AuditLogModel.action == action)
        if resource_type:
            filters.append(AuditLogModel.resource_type == resource_type)
        if date_from:
            filters.append(AuditLogModel.created_at >= datetime.combine(date_from, time.min, tzinfo=UTC))
        if date_to:
            filters.append(AuditLogModel.created_at <= datetime.combine(date_to, time.max, tzinfo=UTC))

        total = self._session.scalar(select(func.count()).select_from(AuditLogModel).where(*filters)) or 0
        rows = self._session.execute(
            select(AuditLogModel, UserModel.email)
            .join(UserModel, AuditLogModel.user_id == UserModel.id)
            .where(*filters)
            .order_by(AuditLogModel.created_at.desc(), AuditLogModel.id.desc())
            .offset(page.offset)
            .limit(page.page_size)
        ).all()
        return PageResult(
            items=[
                AuditLogEntry(
                    audit_log_id=UUID(model.id),
                    user_id=UUID(model.user_id),
                    user_email=user_email,
                    action=model.action,
                    resource_type=model.resource_type,
                    resource_id=model.resource_id,
                    details=model.details,
                    created_at=model.created_at.astimezone(UTC).isoformat(),
                )
                for model, user_email in rows
            ],
            total=total,
            page=page.page,
            page_size=page.page_size,
        )
