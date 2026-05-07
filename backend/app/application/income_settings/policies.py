from __future__ import annotations

from datetime import date
from hashlib import sha256
from uuid import UUID

from app.application.income_settings.models import IncomeSetting
from app.application.reports import add_months


def safe_month_day(*, target_month: date, day: int) -> date:
    next_month = add_months(target_month, 1)
    last_day = (next_month - date.resolution).day
    return target_month.replace(day=min(day, last_day))


def income_source_hash(income_setting_id: UUID, target_month: date) -> str:
    return sha256(f"income_setting:{income_setting_id}:{target_month:%Y-%m}".encode()).hexdigest()


def iter_target_months(*, setting: IncomeSetting, current_month: date) -> list[date]:
    last_month = min(current_month, setting.end_month) if setting.end_month else current_month
    if last_month < setting.start_month:
        return []

    months: list[date] = []
    target_month = setting.start_month
    while target_month <= last_month:
        months.append(target_month)
        target_month = add_months(target_month, 1)
    return months


def effective_values(*, setting: IncomeSetting, target_month: date) -> tuple[int, int]:
    override = next((item for item in setting.overrides if item.target_month == target_month), None)
    if override:
        return override.amount, override.day
    return setting.base_amount, setting.base_day
