from __future__ import annotations

from datetime import date

from pydantic import BaseModel

from app.application.reports import CategorySummary, PeriodSummary, Report, TransactionWithCategory


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
        category_id=str(transaction.category_id),
        category_name=row.category_name,
        amount=transaction.amount.amount,
        transaction_type=transaction.transaction_type.value,
        payment_method=transaction.payment_method,
        memo=transaction.memo,
    )
