from __future__ import annotations

from datetime import date

from pydantic import BaseModel

from app.application.reports import BudgetSummary, CategoryBudgetSummary, CategorySummary, PeriodSummary, Report
from app.application.transaction_views import TransactionWithCategory


class CategorySummaryResponse(BaseModel):
    category_id: str
    name: str
    color: str
    amount: int
    ratio: float


class PeriodSummaryResponse(BaseModel):
    period: str
    total_expense: int
    total_income: int
    balance: int
    transaction_count: int


class BudgetSummaryResponse(BaseModel):
    total_budget: int
    actual_expense: int
    remaining_amount: int
    progress_ratio: float
    is_over_budget: bool
    configured_category_count: int


class CategoryBudgetSummaryResponse(BaseModel):
    category_id: str
    name: str
    color: str
    budget_amount: int
    actual_amount: int
    remaining_amount: int
    progress_ratio: float
    is_over_budget: bool


class ReportResponse(BaseModel):
    period: str
    start_date: date
    end_date: date
    total_expense: int
    average_daily_expense: int
    max_category: CategorySummaryResponse | None
    min_category: CategorySummaryResponse | None
    category_summaries: list[CategorySummaryResponse]
    period_summaries: list[PeriodSummaryResponse]


class RecentTransactionResponse(BaseModel):
    transaction_id: str
    transaction_date: date
    shop_name: str
    category_id: str
    category_name: str
    amount: int
    transaction_type: str
    payment_method: str | None
    memo: str | None


def category_summary_response(summary: CategorySummary) -> CategorySummaryResponse:
    return CategorySummaryResponse(
        category_id=str(summary.category_id),
        name=summary.name,
        color=summary.color,
        amount=summary.amount,
        ratio=summary.ratio,
    )


def period_summary_response(summary: PeriodSummary) -> PeriodSummaryResponse:
    return PeriodSummaryResponse(
        period=summary.period,
        total_expense=summary.total_expense,
        total_income=summary.total_income,
        balance=summary.balance,
        transaction_count=summary.transaction_count,
    )


def budget_summary_response(summary: BudgetSummary) -> BudgetSummaryResponse:
    return BudgetSummaryResponse(
        total_budget=summary.total_budget,
        actual_expense=summary.actual_expense,
        remaining_amount=summary.remaining_amount,
        progress_ratio=summary.progress_ratio,
        is_over_budget=summary.is_over_budget,
        configured_category_count=summary.configured_category_count,
    )


def category_budget_summary_response(summary: CategoryBudgetSummary) -> CategoryBudgetSummaryResponse:
    return CategoryBudgetSummaryResponse(
        category_id=str(summary.category_id),
        name=summary.name,
        color=summary.color,
        budget_amount=summary.budget_amount,
        actual_amount=summary.actual_amount,
        remaining_amount=summary.remaining_amount,
        progress_ratio=summary.progress_ratio,
        is_over_budget=summary.is_over_budget,
    )


def report_response(report: Report) -> ReportResponse:
    return ReportResponse(
        period=report.period,
        start_date=report.start_date,
        end_date=report.end_date,
        total_expense=report.total_expense,
        average_daily_expense=report.average_daily_expense,
        max_category=category_summary_response(report.max_category) if report.max_category else None,
        min_category=category_summary_response(report.min_category) if report.min_category else None,
        category_summaries=[category_summary_response(summary) for summary in report.category_summaries],
        period_summaries=[period_summary_response(summary) for summary in report.period_summaries],
    )


def recent_transaction_response(row: TransactionWithCategory) -> RecentTransactionResponse:
    transaction = row.transaction
    return RecentTransactionResponse(
        transaction_id=str(transaction.id),
        transaction_date=transaction.transaction_date,
        shop_name=transaction.shop_name,
        category_id=str(row.display_category_id),
        category_name=row.category_name,
        amount=transaction.amount.amount,
        transaction_type=transaction.transaction_type.value,
        payment_method=transaction.payment_method,
        memo=transaction.memo,
    )
