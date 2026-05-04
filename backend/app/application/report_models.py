from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from uuid import UUID


@dataclass(frozen=True, slots=True)
class CategorySummary:
    category_id: UUID
    name: str
    color: str
    amount: int
    ratio: float


@dataclass(frozen=True, slots=True)
class PeriodSummary:
    period: str
    total_expense: int
    total_income: int
    balance: int
    transaction_count: int


@dataclass(frozen=True, slots=True)
class Report:
    period: str
    start_date: date
    end_date: date
    total_expense: int
    average_daily_expense: int
    max_category: CategorySummary | None
    min_category: CategorySummary | None
    category_summaries: list[CategorySummary]
    period_summaries: list[PeriodSummary]


@dataclass(frozen=True, slots=True)
class DashboardSummary:
    year_month: str
    total_expense: int
    total_income: int
    balance: int
    transaction_count: int
    expense_change: int
    income_change: int
    balance_change: int
    transaction_count_change: int
    category_summaries: list[CategorySummary]
    monthly_summaries: list[PeriodSummary]


@dataclass(frozen=True, slots=True)
class TransactionExportFilters:
    keyword: str | None = None
    category_id: UUID | None = None
    date_from: date | None = None
    date_to: date | None = None
