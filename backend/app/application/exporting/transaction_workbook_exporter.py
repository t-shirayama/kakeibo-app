from __future__ import annotations

from app.application.exporting.excel_exporter import Worksheet, export_workbook
from app.application.report_models import CategorySummary, PeriodSummary
from app.application.transaction_views import TransactionWithCategory


class TransactionWorkbookExporter:
    # 集計済みデータをExcel向けに整形する責務だけを持つ。
    def export(
        self,
        *,
        rows: list[TransactionWithCategory],
        category_summaries: list[CategorySummary],
        monthly_summaries: list[PeriodSummary],
    ) -> bytes:
        return export_workbook(
            [
                Worksheet(name="明細一覧", rows=self._transaction_sheet(rows)),
                Worksheet(name="カテゴリ集計", rows=self._category_sheet(category_summaries)),
                Worksheet(name="月別集計", rows=self._monthly_sheet(monthly_summaries)),
            ]
        )

    def _transaction_sheet(self, rows: list[TransactionWithCategory]) -> list[list[str | int]]:
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

    def _category_sheet(self, summaries: list[CategorySummary]) -> list[list[str | int]]:
        sheet: list[list[str | int]] = [["カテゴリ", "金額", "割合"]]
        for summary in summaries:
            sheet.append([summary.name, summary.amount, f"{summary.ratio:.4f}"])
        return sheet

    def _monthly_sheet(self, summaries: list[PeriodSummary]) -> list[list[str | int]]:
        sheet: list[list[str | int]] = [["月", "支出", "収入", "収支", "件数"]]
        for summary in summaries:
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
