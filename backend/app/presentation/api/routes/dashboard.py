from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.application.auth.ports import UserRecord
from app.application.reports import DashboardSummary, ReportUseCases
from app.infrastructure.db.session import get_db_session
from app.presentation.api.dependencies import get_current_user
from app.presentation.api.routes.income_settings import apply_due_income_transactions
from app.presentation.api.routes.report_dtos import (
    CategorySummaryResponse,
    PeriodSummaryResponse,
    RecentTransactionResponse,
    category_summary_response,
    period_summary_response,
    recent_transaction_response,
)
from app.presentation.api.service_factories import build_report_use_cases

router = APIRouter()


class DashboardSummaryResponse(BaseModel):
    year_month: str
    total_expense: int
    total_income: int
    balance: int
    transaction_count: int
    expense_change: int
    income_change: int
    balance_change: int
    transaction_count_change: int
    category_summaries: list[CategorySummaryResponse]
    monthly_summaries: list[PeriodSummaryResponse]


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    year: int | None = Query(default=None, ge=1900, le=9999),
    month: int | None = Query(default=None, ge=1, le=12),
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> DashboardSummaryResponse:
    today = date.today()
    apply_due_income_transactions(user_id=current_user.id, session=session)
    summary = _use_cases(session).dashboard_summary(
        user_id=current_user.id,
        year=year or today.year,
        month=month or today.month,
    )
    return _dashboard_summary_response(summary)


@router.get("/recent-transactions", response_model=list[RecentTransactionResponse])
def get_recent_transactions(
    limit: int = Query(default=5, ge=1, le=50),
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> list[RecentTransactionResponse]:
    apply_due_income_transactions(user_id=current_user.id, session=session)
    rows = _use_cases(session).recent_transactions(user_id=current_user.id, limit=limit)
    return [recent_transaction_response(row) for row in rows]


def _use_cases(session: Session) -> ReportUseCases:
    return build_report_use_cases(session)


def _dashboard_summary_response(summary: DashboardSummary) -> DashboardSummaryResponse:
    return DashboardSummaryResponse(
        year_month=summary.year_month,
        total_expense=summary.total_expense,
        total_income=summary.total_income,
        balance=summary.balance,
        transaction_count=summary.transaction_count,
        expense_change=summary.expense_change,
        income_change=summary.income_change,
        balance_change=summary.balance_change,
        transaction_count_change=summary.transaction_count_change,
        category_summaries=[category_summary_response(item) for item in summary.category_summaries],
        monthly_summaries=[period_summary_response(item) for item in summary.monthly_summaries],
    )
