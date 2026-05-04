from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol
from uuid import UUID


@dataclass(frozen=True, slots=True)
class UserSettingsRecord:
    user_id: UUID
    currency: str
    timezone: str
    date_format: str
    page_size: int
    dark_mode: bool


class SettingsRepositoryProtocol(Protocol):
    def get_or_create_settings(self, *, user_id: UUID) -> UserSettingsRecord:
        raise NotImplementedError

    def update_settings(
        self,
        *,
        user_id: UUID,
        currency: str,
        timezone: str,
        page_size: int,
        date_format: str,
        dark_mode: bool,
    ) -> UserSettingsRecord:
        raise NotImplementedError

    def list_active_upload_paths(self, *, user_id: UUID) -> list[str]:
        raise NotImplementedError

    def soft_delete_user_data(self, *, user_id: UUID) -> None:
        raise NotImplementedError


class UploadStorageProtocol(Protocol):
    def delete(self, stored_file_path: str) -> None:
        raise NotImplementedError
