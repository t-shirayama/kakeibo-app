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
