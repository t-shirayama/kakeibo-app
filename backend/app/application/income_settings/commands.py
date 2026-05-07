from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from uuid import UUID


@dataclass(frozen=True, slots=True)
class IncomeSettingCommand:
    member_name: str
    category_id: UUID
    base_amount: int
    base_day: int
    start_month: date
    end_month: date | None


@dataclass(frozen=True, slots=True)
class IncomeOverrideCommand:
    target_month: date
    amount: int
    day: int
