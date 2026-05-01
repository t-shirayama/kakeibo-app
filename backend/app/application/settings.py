from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from app.application.auth.password_hasher import PasswordHasher
from app.application.auth.ports import UserRecord
from app.infrastructure.repositories.settings import SettingsRepository, UserSettingsRecord
from app.infrastructure.storage import LocalUploadStorage


class SettingsError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class UpdateSettingsCommand:
    page_size: int
    date_format: str
    dark_mode: bool


class SettingsUseCases:
    allowed_page_sizes = {10, 20, 50}
    currency = "JPY"
    timezone = "Asia/Tokyo"

    def __init__(
        self,
        repository: SettingsRepository,
        storage: LocalUploadStorage,
        password_hasher: PasswordHasher | None = None,
    ) -> None:
        self._repository = repository
        self._storage = storage
        self._password_hasher = password_hasher or PasswordHasher()

    def get_settings(self, user_id: UUID) -> UserSettingsRecord:
        return self._repository.get_or_create_settings(user_id=user_id)

    def update_settings(self, *, user_id: UUID, command: UpdateSettingsCommand) -> UserSettingsRecord:
        if command.page_size not in self.allowed_page_sizes:
            raise SettingsError("page_size must be one of 10, 20, or 50.")
        if command.date_format not in {"yyyy/MM/dd", "yyyy-MM-dd"}:
            raise SettingsError("date_format is not supported.")
        return self._repository.update_settings(
            user_id=user_id,
            currency=self.currency,
            timezone=self.timezone,
            page_size=command.page_size,
            date_format=command.date_format,
            dark_mode=command.dark_mode,
        )

    def delete_all_user_data(
        self,
        *,
        current_user: UserRecord,
        confirmation_text: str | None,
        password: str | None,
    ) -> None:
        if confirmation_text != "DELETE" and not (
            password and self._password_hasher.verify(password, current_user.password_hash)
        ):
            raise SettingsError("Confirmation text must be DELETE or password must be valid.")

        upload_paths = self._repository.list_active_upload_paths(user_id=current_user.id)
        self._repository.soft_delete_user_data(user_id=current_user.id)
        for path in upload_paths:
            self._storage.delete(path)
