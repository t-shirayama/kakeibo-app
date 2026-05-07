from __future__ import annotations

from datetime import date, timedelta


def month_range(year: int, month: int) -> tuple[date, date]:
    start = date(year, month, 1)
    next_month = add_months(start, 1)
    return start, next_month - timedelta(days=1)


def previous_month_range(start_date: date) -> tuple[date, date]:
    previous_start = add_months(start_date.replace(day=1), -1)
    return previous_start, start_date.replace(day=1) - timedelta(days=1)


def add_months(value: date, months: int) -> date:
    month_index = value.year * 12 + value.month - 1 + months
    year, month_zero = divmod(month_index, 12)
    return date(year, month_zero + 1, 1)
