from __future__ import annotations

from datetime import date
from typing import Protocol
from uuid import UUID

from app.application.income_settings.commands import IncomeOverrideCommand, IncomeSettingCommand
from app.application.income_settings.models import IncomeSetting


class IncomeSettingsRepositoryProtocol(Protocol):
    def list_settings(self, *, user_id: UUID) -> list[IncomeSetting]:
        raise NotImplementedError

    def create_setting(self, *, user_id: UUID, command: IncomeSettingCommand) -> IncomeSetting:
        raise NotImplementedError

    def update_setting(self, *, user_id: UUID, income_setting_id: UUID, command: IncomeSettingCommand) -> IncomeSetting:
        raise NotImplementedError

    def delete_setting(self, *, user_id: UUID, income_setting_id: UUID) -> None:
        raise NotImplementedError

    def upsert_override(self, *, user_id: UUID, income_setting_id: UUID, command: IncomeOverrideCommand) -> None:
        raise NotImplementedError

    def delete_override(self, *, user_id: UUID, income_setting_id: UUID, target_month: date) -> None:
        raise NotImplementedError

    def get_setting(self, *, user_id: UUID, income_setting_id: UUID) -> IncomeSetting | None:
        raise NotImplementedError
