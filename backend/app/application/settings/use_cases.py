from __future__ import annotations

from uuid import UUID

from app.application.settings.commands import UpdateSettingsCommand
from app.application.settings.ports import SettingsRepositoryProtocol, UserSettingsRecord


class SettingsError(ValueError):
    pass


class SettingsUseCases:
    # 初期リリースでは通貨とタイムゾーンを固定し、画面設定だけを更新対象にする。
    allowed_page_sizes = {10, 20, 50}
    currency = "JPY"
    timezone = "Asia/Tokyo"

    def __init__(
        self,
        repository: SettingsRepositoryProtocol,
    ) -> None:
        self._repository = repository

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
