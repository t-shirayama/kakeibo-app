from __future__ import annotations

from datetime import date
from typing import Protocol
from uuid import UUID

from app.application.report_models import CategorySummary, PeriodSummary
from app.application.transaction_views import TransactionWithCategory
from app.domain.entities import Category


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


class ReportCategoryRepositoryProtocol(Protocol):
    def list_categories(self, *, user_id: UUID, include_inactive: bool = False) -> list[Category]:
        raise NotImplementedError


class TransactionWorkbookExporterProtocol(Protocol):
    def export(
        self,
        *,
        rows: list[TransactionWithCategory],
        category_summaries: list[CategorySummary],
        monthly_summaries: list[PeriodSummary],
    ) -> bytes:
        raise NotImplementedError
