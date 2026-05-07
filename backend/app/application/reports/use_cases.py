from __future__ import annotations

from datetime import date, timedelta
from uuid import UUID

from app.application.report_models import CategorySummary, DashboardSummary, Report, TransactionExportFilters
from app.application.reports.periods import add_months, month_range, previous_month_range
from app.application.reports.ports import (
    ReportCategoryRepositoryProtocol,
    ReportRepositoryProtocol,
    TransactionWorkbookExporterProtocol,
)
from app.application.reports.summaries import (
    budget_summary,
    build_report,
    category_budget_summaries,
    category_summaries,
    monthly_sheet_summaries,
    monthly_summaries,
    period_summary,
)
from app.application.transaction_views import TransactionWithCategory


class ReportUseCases:
    # 集計ユースケースは計算結果の生成に集中し、出力形式の都合は別コンポーネントへ渡す。
    def __init__(
        self,
        repository: ReportRepositoryProtocol,
        category_repository: ReportCategoryRepositoryProtocol,
        workbook_exporter: TransactionWorkbookExporterProtocol,
    ) -> None:
        self._repository = repository
        self._category_repository = category_repository
        self._workbook_exporter = workbook_exporter

    def dashboard_summary(self, *, user_id: UUID, year: int, month: int) -> DashboardSummary:
        start_date, end_date = month_range(year, month)
        previous_start, previous_end = previous_month_range(start_date)
        current = self._repository.list_transactions_with_categories(
            user_id=user_id,
            date_from=start_date,
            date_to=end_date,
        )
        previous = self._repository.list_transactions_with_categories(
            user_id=user_id,
            date_from=previous_start,
            date_to=previous_end,
        )
        trend_start = add_months(start_date, -5)
        trend = self._repository.list_transactions_with_categories(
            user_id=user_id,
            date_from=trend_start,
            date_to=end_date,
        )
        categories = self._category_repository.list_categories(user_id=user_id, include_inactive=False)
        current_summary = period_summary(f"{year:04d}-{month:02d}", current)
        previous_summary = period_summary(previous_start.strftime("%Y-%m"), previous)
        return DashboardSummary(
            year_month=current_summary.period,
            total_expense=current_summary.total_expense,
            total_income=current_summary.total_income,
            balance=current_summary.balance,
            transaction_count=current_summary.transaction_count,
            expense_change=current_summary.total_expense - previous_summary.total_expense,
            income_change=current_summary.total_income - previous_summary.total_income,
            balance_change=current_summary.balance - previous_summary.balance,
            transaction_count_change=current_summary.transaction_count - previous_summary.transaction_count,
            budget_summary=budget_summary(current, categories),
            category_budget_summaries=category_budget_summaries(current, categories),
            category_summaries=category_summaries(current),
            monthly_summaries=monthly_summaries(trend, trend_start, end_date),
        )

    def recent_transactions(self, *, user_id: UUID, limit: int = 5) -> list[TransactionWithCategory]:
        return self._repository.list_transactions_with_categories(user_id=user_id, limit=limit)

    def category_summary(self, *, user_id: UUID, start_date: date, end_date: date) -> list[CategorySummary]:
        rows = self._repository.list_transactions_with_categories(
            user_id=user_id,
            date_from=start_date,
            date_to=end_date,
        )
        return category_summaries(rows)

    def monthly_report(self, *, user_id: UUID, year: int, month: int) -> Report:
        start_date, end_date = month_range(year, month)
        rows = self._repository.list_transactions_with_categories(
            user_id=user_id,
            date_from=start_date,
            date_to=end_date,
        )
        trend_start = add_months(start_date, -11)
        trend = self._repository.list_transactions_with_categories(
            user_id=user_id,
            date_from=trend_start,
            date_to=end_date,
        )
        return build_report(
            period=f"{year:04d}-{month:02d}",
            start_date=start_date,
            end_date=end_date,
            rows=rows,
            period_summaries=monthly_summaries(trend, trend_start, end_date),
        )

    def weekly_report(self, *, user_id: UUID, year: int, week: int) -> Report:
        start_date = date.fromisocalendar(year, week, 1)
        end_date = start_date + timedelta(days=6)
        rows = self._repository.list_transactions_with_categories(
            user_id=user_id,
            date_from=start_date,
            date_to=end_date,
        )
        return build_report(
            period=f"{year:04d}-W{week:02d}",
            start_date=start_date,
            end_date=end_date,
            rows=rows,
            period_summaries=[period_summary(f"{year:04d}-W{week:02d}", rows)],
        )

    def yearly_report(self, *, user_id: UUID, year: int) -> Report:
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
        rows = self._repository.list_transactions_with_categories(
            user_id=user_id,
            date_from=start_date,
            date_to=end_date,
        )
        return build_report(
            period=f"{year:04d}",
            start_date=start_date,
            end_date=end_date,
            rows=rows,
            period_summaries=monthly_summaries(rows, start_date, end_date),
        )

    def export_workbook(self, *, user_id: UUID, filters: TransactionExportFilters | None = None) -> bytes:
        export_filters = filters or TransactionExportFilters()
        rows = self._repository.list_transactions_with_categories(
            user_id=user_id,
            keyword=export_filters.keyword,
            category_id=export_filters.category_id,
            date_from=export_filters.date_from,
            date_to=export_filters.date_to,
        )
        return self._workbook_exporter.export(
            rows=rows,
            category_summaries=category_summaries(rows),
            monthly_summaries=monthly_sheet_summaries(rows),
        )
