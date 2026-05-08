from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from uuid import UUID

from app.application.errors import ApplicationError


class IncomeSettingsError(ApplicationError):
    pass


@dataclass(frozen=True, slots=True)
class IncomeOverride:
    override_id: UUID
    target_month: date
    amount: int
    day: int


@dataclass(frozen=True, slots=True)
class IncomeSetting:
    income_setting_id: UUID
    user_id: UUID
    member_name: str
    category_id: UUID
    base_amount: int
    base_day: int
    start_month: date
    end_month: date | None
    overrides: list[IncomeOverride]
