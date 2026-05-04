from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Protocol
from uuid import UUID

from app.application.exporting.excel_exporter import Worksheet, export_workbook
from app.domain.entities import Transaction, TransactionType


@dataclass(frozen=True, slots=True)
class TransactionWithCategory:
    transaction: Transaction
    category_name: str
    category_color: str


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


class ReportRepositoryProtocol(Protocol):
    def list_transactions_with_categories(
        self,
        *,
        user_id: UUID,
        keyword: str | None = None,
        category_id: UUID | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        limit: int | None = None,
    ) -> list[TransactionWithCategory]:
        raise NotImplementedError


class ReportUseCases:
    # 集計ロジックをユースケースに寄せ、APIやExcel出力は同じ計算結果を利用する。
    def __init__(self, repository: ReportRepositoryProtocol) -> None:
        self._repository = repository

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
        current_summary = _period_summary(f"{year:04d}-{month:02d}", current)
        previous_summary = _period_summary(previous_start.strftime("%Y-%m"), previous)
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
            category_summaries=_category_summaries(current),
            monthly_summaries=_monthly_summaries(trend, trend_start, end_date),
        )

    def recent_transactions(self, *, user_id: UUID, limit: int = 5) -> list[TransactionWithCategory]:
        return self._repository.list_transactions_with_categories(user_id=user_id, limit=limit)

    def category_summary(self, *, user_id: UUID, start_date: date, end_date: date) -> list[CategorySummary]:
        rows = self._repository.list_transactions_with_categories(
            user_id=user_id,
            date_from=start_date,
            date_to=end_date,
        )
        return _category_summaries(rows)

    def monthly_report(self, *, user_id: UUID, year: int, month: int) -> Report:
        start_date, end_date = month_range(year, month)
        rows = self._repository.list_transactions_with_categories(
            user_id=user_id,
            date_from=start_date,
            date_to=end_date,
        )
        trend = self._repository.list_transactions_with_categories(
            user_id=user_id,
            date_from=add_months(start_date, -11),
            date_to=end_date,
        )
        return _report(
            period=f"{year:04d}-{month:02d}",
            start_date=start_date,
            end_date=end_date,
            rows=rows,
            period_summaries=_monthly_summaries(trend, add_months(start_date, -11), end_date),
        )

    def weekly_report(self, *, user_id: UUID, year: int, week: int) -> Report:
        start_date = date.fromisocalendar(year, week, 1)
        end_date = start_date + timedelta(days=6)
        rows = self._repository.list_transactions_with_categories(
            user_id=user_id,
            date_from=start_date,
            date_to=end_date,
        )
        return _report(
            period=f"{year:04d}-W{week:02d}",
            start_date=start_date,
            end_date=end_date,
            rows=rows,
            period_summaries=[_period_summary(f"{year:04d}-W{week:02d}", rows)],
        )

    def yearly_report(self, *, user_id: UUID, year: int) -> Report:
        start_date = date(year, 1, 1)
        end_date = date(year, 12, 31)
        rows = self._repository.list_transactions_with_categories(
            user_id=user_id,
            date_from=start_date,
            date_to=end_date,
        )
        return _report(
            period=f"{year:04d}",
            start_date=start_date,
            end_date=end_date,
            rows=rows,
            period_summaries=_monthly_summaries(rows, start_date, end_date),
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
        return export_workbook(
            [
                Worksheet(name="明細一覧", rows=_transaction_sheet(rows)),
                Worksheet(name="カテゴリ集計", rows=_category_sheet(rows)),
                Worksheet(name="月別集計", rows=_monthly_sheet(rows)),
            ]
        )


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


def _report(
    *,
    period: str,
    start_date: date,
    end_date: date,
    rows: list[TransactionWithCategory],
    period_summaries: list[PeriodSummary],
) -> Report:
    categories = _category_summaries(rows)
    return Report(
        period=period,
        start_date=start_date,
        end_date=end_date,
        total_expense=sum(_expense_amount(row.transaction) for row in rows),
        average_daily_expense=_average_daily_expense(rows, start_date, end_date),
        max_category=categories[0] if categories else None,
        min_category=categories[-1] if categories else None,
        category_summaries=categories,
        period_summaries=period_summaries,
    )


def _period_summary(period: str, rows: list[TransactionWithCategory]) -> PeriodSummary:
    total_expense = sum(_expense_amount(row.transaction) for row in rows)
    total_income = sum(
        row.transaction.amount.amount
        for row in rows
        if row.transaction.transaction_type == TransactionType.INCOME
    )
    return PeriodSummary(
        period=period,
        total_expense=total_expense,
        total_income=total_income,
        balance=total_income - total_expense,
        transaction_count=len(rows),
    )


def _category_summaries(rows: list[TransactionWithCategory]) -> list[CategorySummary]:
    # カテゴリ別集計は支出のみを対象にし、収入は残高計算側で扱う。
    totals: dict[UUID, tuple[str, str, int]] = {}
    for row in rows:
        amount = _expense_amount(row.transaction)
        if amount == 0:
            continue
        _, _, current = totals.get(row.transaction.category_id, (row.category_name, row.category_color, 0))
        totals[row.transaction.category_id] = (row.category_name, row.category_color, current + amount)
    total = sum(amount for _, _, amount in totals.values())
    return [
        CategorySummary(
            category_id=category_id,
            name=name,
            color=color,
            amount=amount,
            ratio=(amount / total if total else 0),
        )
        for category_id, (name, color, amount) in sorted(totals.items(), key=lambda item: item[1][2], reverse=True)
    ]


def _monthly_summaries(rows: list[TransactionWithCategory], start_date: date, end_date: date) -> list[PeriodSummary]:
    # 明細がない月も0件として返し、グラフの月並びが欠けないようにする。
    result: list[PeriodSummary] = []
    cursor = start_date.replace(day=1)
    while cursor <= end_date:
        month_rows = [
            row
            for row in rows
            if row.transaction.transaction_date.strftime("%Y-%m") == cursor.strftime("%Y-%m")
        ]
        result.append(_period_summary(cursor.strftime("%Y-%m"), month_rows))
        cursor = add_months(cursor, 1)
    return result


def _average_daily_expense(rows: list[TransactionWithCategory], start_date: date, end_date: date) -> int:
    days = (end_date - start_date).days + 1
    return round(sum(_expense_amount(row.transaction) for row in rows) / days) if days > 0 else 0


def _expense_amount(transaction: Transaction) -> int:
    if transaction.transaction_type != TransactionType.EXPENSE:
        return 0
    return transaction.amount.amount


def _transaction_sheet(rows: list[TransactionWithCategory]) -> list[list[str | int]]:
    sheet: list[list[str | int]] = [["日付", "店名", "カテゴリ", "種別", "金額", "支払方法", "利用者", "メモ"]]
    for row in rows:
        transaction = row.transaction
        sheet.append(
            [
                transaction.transaction_date.isoformat(),
                transaction.shop_name,
                row.category_name,
                transaction.transaction_type.value,
                transaction.amount.amount,
                transaction.payment_method or "",
                transaction.card_user_name or "",
                transaction.memo or "",
            ]
        )
    return sheet


def _category_sheet(rows: list[TransactionWithCategory]) -> list[list[str | int]]:
    sheet: list[list[str | int]] = [["カテゴリ", "金額", "割合"]]
    for summary in _category_summaries(rows):
        sheet.append([summary.name, summary.amount, f"{summary.ratio:.4f}"])
    return sheet


def _monthly_sheet(rows: list[TransactionWithCategory]) -> list[list[str | int]]:
    if not rows:
        return [["月", "支出", "収入", "収支", "件数"]]
    dates = [row.transaction.transaction_date for row in rows]
    sheet: list[list[str | int]] = [["月", "支出", "収入", "収支", "件数"]]
    for summary in _monthly_summaries(rows, min(dates), max(dates)):
        sheet.append(
            [
                summary.period,
                summary.total_expense,
                summary.total_income,
                summary.balance,
                summary.transaction_count,
            ]
        )
    return sheet
