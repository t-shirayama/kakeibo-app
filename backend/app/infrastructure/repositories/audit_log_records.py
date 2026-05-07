from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.infrastructure.models.audit_log import AuditLogModel


class AuditLogRecordRepository:
    # 監査ログの永続化だけを担当し、各機能の業務判断は持ち込まない。
    def __init__(self, session: Session) -> None:
        self._session = session

    def create_audit_log(
        self,
        *,
        user_id: UUID,
        action: str,
        resource_type: str,
        resource_id: UUID,
        details: dict[str, object],
    ) -> None:
        self._session.add(
            AuditLogModel(
                user_id=str(user_id),
                action=action,
                resource_type=resource_type,
                resource_id=str(resource_id),
                details=details,
            )
        )
        self._session.commit()
