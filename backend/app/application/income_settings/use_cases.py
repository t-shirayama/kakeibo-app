from __future__ import annotations

from datetime import date
from uuid import UUID

from app.application.dates import app_today
from app.application.income_settings.commands import IncomeOverrideCommand, IncomeSettingCommand
from app.application.income_settings.models import IncomeSetting, IncomeSettingsError
from app.application.income_settings.policies import (
    effective_values,
    income_source_hash,
    iter_target_months,
    safe_month_day,
)
from app.application.income_settings.ports import IncomeSettingsRepositoryProtocol
from app.application.transactions import CategoryRepositoryProtocol, TransactionRepositoryProtocol
from app.domain.entities import Transaction, TransactionType
from app.domain.value_objects import MoneyJPY


class IncomeSettingsUseCases:
    def __init__(
        self,
        repository: IncomeSettingsRepositoryProtocol,
        transaction_repository: TransactionRepositoryProtocol,
        category_repository: CategoryRepositoryProtocol,
    ) -> None:
        self._repository = repository
        self._transaction_repository = transaction_repository
        self._category_repository = category_repository

    def list_settings(self, *, user_id: UUID) -> list[IncomeSetting]:
        self.apply_due_transactions(user_id=user_id)
        return self._repository.list_settings(user_id=user_id)

    def create_setting(self, *, user_id: UUID, command: IncomeSettingCommand) -> IncomeSetting:
        self._validate_command(user_id=user_id, command=command)
        setting = self._repository.create_setting(user_id=user_id, command=command)
        self.apply_due_transactions(user_id=user_id)
        return setting

    def update_setting(self, *, user_id: UUID, income_setting_id: UUID, command: IncomeSettingCommand) -> IncomeSetting:
        self._ensure_setting(user_id=user_id, income_setting_id=income_setting_id)
        self._validate_command(user_id=user_id, command=command)
        setting = self._repository.update_setting(user_id=user_id, income_setting_id=income_setting_id, command=command)
        self.apply_due_transactions(user_id=user_id)
        return setting

    def delete_setting(self, *, user_id: UUID, income_setting_id: UUID) -> None:
        self._ensure_setting(user_id=user_id, income_setting_id=income_setting_id)
        self._repository.delete_setting(user_id=user_id, income_setting_id=income_setting_id)

    def upsert_override(self, *, user_id: UUID, income_setting_id: UUID, command: IncomeOverrideCommand) -> IncomeSetting:
        self._ensure_setting(user_id=user_id, income_setting_id=income_setting_id)
        self._validate_amount_and_day(amount=command.amount, day=command.day)
        target_month = command.target_month.replace(day=1)
        self._repository.upsert_override(
            user_id=user_id,
            income_setting_id=income_setting_id,
            command=IncomeOverrideCommand(target_month=target_month, amount=command.amount, day=command.day),
        )
        return self._ensure_setting(user_id=user_id, income_setting_id=income_setting_id)

    def delete_override(self, *, user_id: UUID, income_setting_id: UUID, target_month: date) -> IncomeSetting:
        self._ensure_setting(user_id=user_id, income_setting_id=income_setting_id)
        self._repository.delete_override(user_id=user_id, income_setting_id=income_setting_id, target_month=target_month.replace(day=1))
        return self._ensure_setting(user_id=user_id, income_setting_id=income_setting_id)

    def apply_due_transactions(self, *, user_id: UUID, today: date | None = None) -> int:
        current_date = today or app_today()
        current_month = current_date.replace(day=1)
        created_count = 0
        for setting in self._repository.list_settings(user_id=user_id):
            for target_month in iter_target_months(setting=setting, current_month=current_month):
                amount, day = effective_values(setting=setting, target_month=target_month)
                transaction_date = safe_month_day(target_month=target_month, day=day)
                if current_date < transaction_date:
                    continue
                source_hash = income_source_hash(setting.income_setting_id, target_month)
                if self._transaction_repository.source_hash_exists(user_id=user_id, source_hash=source_hash):
                    continue
                self._transaction_repository.create_transaction(
                    Transaction(
                        id=self._transaction_repository.next_id(),
                        user_id=user_id,
                        category_id=setting.category_id,
                        transaction_date=transaction_date,
                        shop_name=f"{setting.member_name} 収入",
                        amount=MoneyJPY(amount),
                        transaction_type=TransactionType.INCOME,
                        payment_method="自動登録",
                        card_user_name=setting.member_name,
                        memo="収入設定から自動登録",
                        source_format="income_setting",
                        source_hash=source_hash,
                    )
                )
                created_count += 1
        return created_count

    def _ensure_setting(self, *, user_id: UUID, income_setting_id: UUID) -> IncomeSetting:
        setting = self._repository.get_setting(user_id=user_id, income_setting_id=income_setting_id)
        if setting is None:
            raise IncomeSettingsError("Income setting not found.")
        return setting

    def _validate_command(self, *, user_id: UUID, command: IncomeSettingCommand) -> None:
        if not command.member_name.strip():
            raise IncomeSettingsError("Member name is required.")
        self._validate_amount_and_day(amount=command.base_amount, day=command.base_day)
        if command.end_month and command.end_month < command.start_month:
            raise IncomeSettingsError("End month must be greater than or equal to start month.")
        category = self._category_repository.get_category(user_id=user_id, category_id=command.category_id)
        if category is None or not category.is_active:
            raise IncomeSettingsError("Category not found or inactive.")

    def _validate_amount_and_day(self, *, amount: int, day: int) -> None:
        if amount < 0:
            raise IncomeSettingsError("Amount must be greater than or equal to 0.")
        if day < 1 or day > 31:
            raise IncomeSettingsError("Day must be between 1 and 31.")
