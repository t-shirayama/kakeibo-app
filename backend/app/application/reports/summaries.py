from __future__ import annotations

from datetime import date
from uuid import UUID

from app.application.report_models import (
    BudgetSummary,
    CategoryBudgetSummary,
    CategorySummary,
    PeriodSummary,
    Report,
)
from app.application.reports.periods import add_months
from app.application.transaction_views import TransactionWithCategory
from app.domain.entities import Category, Transaction, TransactionType


def build_report(
    *,
    period: str,
    start_date: date,
    end_date: date,
    rows: list[TransactionWithCategory],
    period_summaries: list[PeriodSummary],
) -> Report:
    categories = category_summaries(rows)
    return Report(
        period=period,
        start_date=start_date,
        end_date=end_date,
        total_expense=sum(expense_amount(row.transaction) for row in rows),
        average_daily_expense=average_daily_expense(rows, start_date, end_date),
        max_category=categories[0] if categories else None,
        min_category=categories[-1] if categories else None,
        category_summaries=categories,
        period_summaries=period_summaries,
    )


def period_summary(period: str, rows: list[TransactionWithCategory]) -> PeriodSummary:
    total_expense = sum(expense_amount(row.transaction) for row in rows)
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


def category_summaries(rows: list[TransactionWithCategory]) -> list[CategorySummary]:
    # カテゴリ別集計は支出のみを対象にし、収入は残高計算側で扱う。
    totals: dict[UUID, tuple[str, str, int]] = {}
    for row in rows:
        amount = expense_amount(row.transaction)
        if amount == 0:
            continue
        _, _, current = totals.get(row.display_category_id, (row.category_name, row.category_color, 0))
        totals[row.display_category_id] = (row.category_name, row.category_color, current + amount)
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


def budget_summary(rows: list[TransactionWithCategory], categories: list[Category]) -> BudgetSummary:
    configured_categories = [category for category in categories if category.monthly_budget is not None]
    total_budget = sum(category.monthly_budget.amount for category in configured_categories if category.monthly_budget is not None)
    actual_expense = sum(expense_amount(row.transaction) for row in rows)
    remaining_amount = total_budget - actual_expense
    progress_ratio = (actual_expense / total_budget) if total_budget > 0 else 0
    return BudgetSummary(
        total_budget=total_budget,
        actual_expense=actual_expense,
        remaining_amount=remaining_amount,
        progress_ratio=progress_ratio,
        is_over_budget=total_budget > 0 and actual_expense > total_budget,
        configured_category_count=len(configured_categories),
    )


def category_budget_summaries(rows: list[TransactionWithCategory], categories: list[Category]) -> list[CategoryBudgetSummary]:
    actual_by_category: dict[UUID, int] = {}
    for row in rows:
        amount = expense_amount(row.transaction)
        if amount == 0:
            continue
        actual_by_category[row.display_category_id] = actual_by_category.get(row.display_category_id, 0) + amount

    summaries: list[CategoryBudgetSummary] = []
    for category in categories:
        if category.monthly_budget is None:
            continue
        actual_amount = actual_by_category.get(category.id, 0)
        budget_amount = category.monthly_budget.amount
        remaining_amount = budget_amount - actual_amount
        summaries.append(
            CategoryBudgetSummary(
                category_id=category.id,
                name=category.name,
                color=category.color,
                budget_amount=budget_amount,
                actual_amount=actual_amount,
                remaining_amount=remaining_amount,
                progress_ratio=(actual_amount / budget_amount) if budget_amount > 0 else 0,
                is_over_budget=budget_amount > 0 and actual_amount > budget_amount,
            )
        )
    return sorted(summaries, key=lambda item: (not item.is_over_budget, -item.progress_ratio, -item.actual_amount, item.name))


def monthly_summaries(rows: list[TransactionWithCategory], start_date: date, end_date: date) -> list[PeriodSummary]:
    # 明細がない月も0件として返し、グラフの月並びが欠けないようにする。
    result: list[PeriodSummary] = []
    cursor = start_date.replace(day=1)
    while cursor <= end_date:
        month_rows = [
            row
            for row in rows
            if row.transaction.transaction_date.strftime("%Y-%m") == cursor.strftime("%Y-%m")
        ]
        result.append(period_summary(cursor.strftime("%Y-%m"), month_rows))
        cursor = add_months(cursor, 1)
    return result


def monthly_sheet_summaries(rows: list[TransactionWithCategory]) -> list[PeriodSummary]:
    if not rows:
        return []
    dates = [row.transaction.transaction_date for row in rows]
    return monthly_summaries(rows, min(dates), max(dates))


def average_daily_expense(rows: list[TransactionWithCategory], start_date: date, end_date: date) -> int:
    days = (end_date - start_date).days + 1
    return round(sum(expense_amount(row.transaction) for row in rows) / days) if days > 0 else 0


def expense_amount(transaction: Transaction) -> int:
    if transaction.transaction_type != TransactionType.EXPENSE:
        return 0
    return transaction.amount.amount
