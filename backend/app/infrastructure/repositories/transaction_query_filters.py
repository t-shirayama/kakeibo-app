from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.infrastructure.models.category import CategoryModel
from app.infrastructure.models.transaction import TransactionModel
from app.infrastructure.repositories.transaction_category_rules import (
    UNCATEGORIZED_CATEGORY_NAME,
    is_uncategorized_category,
    unavailable_category_ids_query,
    uncategorized_category_ids_query,
)

LIKE_ESCAPE = "\\"


def literal_like_pattern(value: str) -> str:
    escaped = (
        value.replace(LIKE_ESCAPE, LIKE_ESCAPE + LIKE_ESCAPE)
        .replace("%", LIKE_ESCAPE + "%")
        .replace("_", LIKE_ESCAPE + "_")
    )
    return f"%{escaped}%"


class TransactionQueryFilterBuilder:
    def __init__(self, session: Session) -> None:
        self._session = session

    def build(
        self,
        *,
        user_id: UUID,
        keyword: str | None = None,
        category_id: UUID | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[object]:
        filters: list[object] = [TransactionModel.user_id == str(user_id), TransactionModel.deleted_at.is_(None)]
        # 一覧系は必ずログインユーザー本人かつ未削除データに限定する。
        if keyword:
            filters.append(self._keyword_filter(user_id=user_id, keyword=keyword))
        if category_id:
            filters.append(self._category_filter(user_id=user_id, category_id=category_id))
        if date_from:
            filters.append(TransactionModel.transaction_date >= date_from)
        if date_to:
            filters.append(TransactionModel.transaction_date <= date_to)
        return filters

    def _category_filter(self, *, user_id: UUID, category_id: UUID):
        # 未分類フィルターでは、無効化・論理削除されたカテゴリの明細も未分類として扱う。
        if not is_uncategorized_category(session=self._session, user_id=user_id, category_id=category_id):
            return TransactionModel.category_id == str(category_id)

        return or_(
            TransactionModel.category_id == str(category_id),
            TransactionModel.category_id.in_(unavailable_category_ids_query(user_id)),
        )

    def _keyword_filter(self, *, user_id: UUID, keyword: str):
        pattern = literal_like_pattern(keyword)
        matching_category_ids = select(CategoryModel.id).where(
            CategoryModel.user_id == str(user_id),
            CategoryModel.deleted_at.is_(None),
            CategoryModel.name.like(pattern, escape=LIKE_ESCAPE),
        )
        conditions = [
            TransactionModel.shop_name.like(pattern, escape=LIKE_ESCAPE),
            TransactionModel.memo.like(pattern, escape=LIKE_ESCAPE),
            TransactionModel.category_id.in_(matching_category_ids),
        ]
        if UNCATEGORIZED_CATEGORY_NAME in keyword:
            conditions.extend(
                [
                    TransactionModel.category_id.in_(uncategorized_category_ids_query(user_id)),
                    TransactionModel.category_id.in_(unavailable_category_ids_query(user_id)),
                ]
            )
        return or_(*conditions)
