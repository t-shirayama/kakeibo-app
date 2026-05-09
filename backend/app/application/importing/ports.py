from __future__ import annotations

from typing import Protocol
from uuid import UUID

from app.domain.entities import Upload, UploadStatus
from app.application.transactions import TransactionCommand


class UploadRepositoryProtocol(Protocol):
    def next_id(self) -> UUID:
        raise NotImplementedError

    def create_upload(
        self,
        *,
        upload_id: UUID,
        user_id: UUID,
        file_name: str,
        stored_file_path: str,
        status: UploadStatus,
    ) -> Upload:
        raise NotImplementedError

    def mark_completed(self, *, upload_id: UUID, imported_count: int) -> Upload:
        raise NotImplementedError

    def mark_failed(self, *, upload_id: UUID, error_message: str) -> Upload:
        raise NotImplementedError

    def list_uploads(self, *, user_id: UUID) -> list[Upload]:
        raise NotImplementedError

    def get_upload(self, *, user_id: UUID, upload_id: UUID) -> Upload | None:
        raise NotImplementedError

    def soft_delete_upload(self, *, user_id: UUID, upload_id: UUID) -> Upload | None:
        raise NotImplementedError


class UploadAuditLogRepositoryProtocol(Protocol):
    def create_audit_log(
        self,
        *,
        user_id: UUID,
        action: str,
        resource_type: str,
        resource_id: UUID,
        details: dict[str, object],
    ) -> None:
        raise NotImplementedError


class ImportedTransactionWriterProtocol(Protocol):
    def source_hash_exists(self, *, user_id: UUID, source_hash: str) -> bool:
        raise NotImplementedError

    def create_imported_transaction(self, *, user_id: UUID, command: TransactionCommand) -> None:
        raise NotImplementedError


class UploadStorageProtocol(Protocol):
    def save_original(self, *, user_id: UUID, upload_id: UUID, content: bytes) -> str:
        raise NotImplementedError

    def delete(self, stored_file_path: str) -> None:
        raise NotImplementedError
