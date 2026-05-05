from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.entities import Upload, UploadStatus
from app.infrastructure.models.audit_log import AuditLogModel
from app.infrastructure.models.upload import UploadModel


class UploadRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def next_id(self) -> UUID:
        return uuid4()

    def create_upload(
        self,
        *,
        upload_id: UUID,
        user_id: UUID,
        file_name: str,
        stored_file_path: str,
        status: UploadStatus,
    ) -> Upload:
        model = UploadModel(
            id=str(upload_id),
            user_id=str(user_id),
            file_name=file_name,
            stored_file_path=stored_file_path,
            status=status.value,
        )
        self._session.add(model)
        self._session.commit()
        self._session.refresh(model)
        return self._to_upload(model)

    def mark_completed(self, *, upload_id: UUID, imported_count: int) -> Upload:
        model = self._must_get(upload_id)
        model.status = UploadStatus.COMPLETED.value
        model.imported_count = imported_count
        self._session.commit()
        self._session.refresh(model)
        return self._to_upload(model)

    def mark_failed(self, *, upload_id: UUID, error_message: str) -> Upload:
        # 直前のINSERT/UPDATEが失敗した場合でも、履歴だけは failed へ落とせるようにする。
        self._session.rollback()
        model = self._must_get(upload_id)
        model.status = UploadStatus.FAILED.value
        model.error_message = error_message[:1000]
        self._session.commit()
        self._session.refresh(model)
        return self._to_upload(model)

    def list_uploads(self, *, user_id: UUID) -> list[Upload]:
        rows = self._session.scalars(
            select(UploadModel)
            .where(UploadModel.user_id == str(user_id), UploadModel.deleted_at.is_(None))
            .order_by(UploadModel.uploaded_at.desc())
        ).all()
        return [self._to_upload(row) for row in rows]

    def get_upload(self, *, user_id: UUID, upload_id: UUID) -> Upload | None:
        model = self._session.scalar(
            select(UploadModel).where(
                UploadModel.id == str(upload_id),
                UploadModel.user_id == str(user_id),
                UploadModel.deleted_at.is_(None),
            )
        )
        return self._to_upload(model) if model else None

    def soft_delete_upload(self, *, user_id: UUID, upload_id: UUID) -> Upload | None:
        model = self._session.scalar(
            select(UploadModel).where(
                UploadModel.id == str(upload_id),
                UploadModel.user_id == str(user_id),
                UploadModel.deleted_at.is_(None),
            )
        )
        if model is None:
            return None
        model.deleted_at = datetime.now(UTC)
        self._session.commit()
        return self._to_upload(model)

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

    def _must_get(self, upload_id: UUID) -> UploadModel:
        model = self._session.get(UploadModel, str(upload_id))
        if model is None:
            raise ValueError("Upload not found.")
        return model

    def _to_upload(self, model: UploadModel) -> Upload:
        return Upload(
            id=UUID(model.id),
            user_id=UUID(model.user_id),
            file_name=model.file_name,
            stored_file_path=model.stored_file_path,
            status=UploadStatus(model.status),
            uploaded_at=model.uploaded_at,
            imported_count=model.imported_count,
            error_message=model.error_message,
        )
