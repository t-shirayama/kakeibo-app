from __future__ import annotations

from typing import Protocol
from uuid import UUID


class UserDataRepositoryProtocol(Protocol):
    def list_active_upload_paths(self, *, user_id: UUID) -> list[str]:
        raise NotImplementedError

    def soft_delete_user_data(self, *, user_id: UUID) -> None:
        raise NotImplementedError


class UploadStorageProtocol(Protocol):
    def delete(self, stored_file_path: str) -> None:
        raise NotImplementedError
