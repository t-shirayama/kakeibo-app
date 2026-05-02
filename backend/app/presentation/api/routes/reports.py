from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.application.auth.ports import UserRecord
from app.application.reports import ReportUseCases, month_range
from app.infrastructure.db.session import get_db_session
from app.infrastructure.repositories.transactions import TransactionCategoryRepository
from app.presentation.api.dependencies import get_current_user
from app.presentation.api.routes.income_settings import apply_due_income_transactions
from app.presentation.api.routes.report_dtos import (
    CategorySummaryResponse,
    ReportResponse,
    category_summary_response,
    report_response,
)

router = APIRouter()


@router.get("/categories", response_model=list[CategorySummaryResponse])
def get_category_summary(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> list[CategorySummaryResponse]:
    today = date.today()
    apply_due_income_transactions(user_id=current_user.id, session=session)
    default_start, default_end = month_range(today.year, today.month)
    summaries = _use_cases(session).category_summary(
        user_id=current_user.id,
        start_date=start_date or default_start,
        end_date=end_date or default_end,
    )
    return [category_summary_response(summary) for summary in summaries]


@router.get("/monthly", response_model=ReportResponse)
def get_monthly_report(
    year: int | None = Query(default=None, ge=1900, le=9999),
    month: int | None = Query(default=None, ge=1, le=12),
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> ReportResponse:
    today = date.today()
    apply_due_income_transactions(user_id=current_user.id, session=session)
    report = _use_cases(session).monthly_report(
        user_id=current_user.id,
        year=year or today.year,
        month=month or today.month,
    )
    return report_response(report)


@router.get("/weekly", response_model=ReportResponse)
def get_weekly_report(
    year: int | None = Query(default=None, ge=1900, le=9999),
    week: int | None = Query(default=None, ge=1, le=53),
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> ReportResponse:
    today = date.today()
    apply_due_income_transactions(user_id=current_user.id, session=session)
    iso = today.isocalendar()
    try:
        report = _use_cases(session).weekly_report(
            user_id=current_user.id,
            year=year or iso.year,
            week=week or iso.week,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid ISO week.") from exc
    return report_response(report)


@router.get("/yearly", response_model=ReportResponse)
def get_yearly_report(
    year: int | None = Query(default=None, ge=1900, le=9999),
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> ReportResponse:
    apply_due_income_transactions(user_id=current_user.id, session=session)
    report = _use_cases(session).yearly_report(user_id=current_user.id, year=year or date.today().year)
    return report_response(report)


def _use_cases(session: Session) -> ReportUseCases:
    return ReportUseCases(TransactionCategoryRepository(session))
