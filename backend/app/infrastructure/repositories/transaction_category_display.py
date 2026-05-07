from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.application.transaction_views import TransactionWithCategory
from app.infrastructure.models.category import CategoryModel
from app.infrastructure.models.transaction import TransactionModel
from app.infrastructure.repositories.mappers import to_transaction
from app.infrastructure.repositories.transaction_category_rules import (
    UNCATEGORIZED_CATEGORY_COLOR,
    UNCATEGORIZED_CATEGORY_NAME,
)


@dataclass(frozen=True, slots=True)
class CategoryDisplay:
    category_id: UUID | None
    name: str
    color: str


class TransactionCategoryDisplayResolver:
    def __init__(self, session: Session) -> None:
        self._session = session

    def uncategorized_display(self, user_id: UUID) -> CategoryDisplay:
        row = self._session.scalar(
            select(CategoryModel).where(
                CategoryModel.user_id == str(user_id),
                CategoryModel.name == UNCATEGORIZED_CATEGORY_NAME,
                CategoryModel.deleted_at.is_(None),
            )
        )
        if row is None:
            return CategoryDisplay(None, UNCATEGORIZED_CATEGORY_NAME, UNCATEGORIZED_CATEGORY_COLOR)
        return CategoryDisplay(UUID(row.id), row.name, row.color)

    def to_transaction_with_category(
        self,
        *,
        transaction: TransactionModel,
        category_id: str | None,
        category_name: str | None,
        category_color: str | None,
        category_is_active: bool | None,
        category_deleted_at: datetime | None,
        uncategorized: CategoryDisplay,
    ) -> TransactionWithCategory:
        is_display_uncategorized = (
            category_id is None
            or category_name is None
            or category_color is None
            or category_is_active is not True
            or category_deleted_at is not None
        )
        display_category_id = uncategorized.category_id or UUID(transaction.category_id)
        display_name = uncategorized.name
        display_color = uncategorized.color
        if not is_display_uncategorized:
            display_category_id = UUID(category_id)
            display_name = category_name
            display_color = category_color

        return TransactionWithCategory(
            transaction=to_transaction(transaction),
            display_category_id=display_category_id,
            category_name=display_name,
            category_color=display_color,
        )
