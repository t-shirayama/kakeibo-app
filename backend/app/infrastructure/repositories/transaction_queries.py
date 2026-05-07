from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.application.common import Page, PageResult
from app.application.transaction_views import TransactionWithCategory
from app.infrastructure.models.category import CategoryModel
from app.infrastructure.models.transaction import TransactionModel
from app.infrastructure.repositories.transaction_category_display import TransactionCategoryDisplayResolver
from app.infrastructure.repositories.transaction_query_filters import TransactionQueryFilterBuilder
from app.infrastructure.repositories.transaction_query_sorting import recent_transaction_order_by, transaction_order_by


class TransactionQueryRepository:
    # 一覧検索と表示用カテゴリ解決を担当し、更新系の保存責務は持たない。
    def __init__(self, session: Session) -> None:
        self._session = session
        self._filters = TransactionQueryFilterBuilder(session)
        self._display = TransactionCategoryDisplayResolver(session)

    def list_transactions(
        self,
        *,
        user_id: UUID,
        page: Page,
        keyword: str | None = None,
        category_id: UUID | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        sort_field: str = "date",
        sort_direction: str = "desc",
    ) -> PageResult[TransactionWithCategory]:
        filters = self._filters.build(
            user_id=user_id,
            keyword=keyword,
            category_id=category_id,
            date_from=date_from,
            date_to=date_to,
        )
        total = self._session.scalar(select(func.count()).select_from(TransactionModel).where(*filters)) or 0
        rows = self._session.execute(
            select(
                TransactionModel,
                CategoryModel.id,
                CategoryModel.name,
                CategoryModel.color,
                CategoryModel.is_active,
                CategoryModel.deleted_at,
            )
            .join(CategoryModel, TransactionModel.category_id == CategoryModel.id, isouter=True)
            .where(*filters)
            .order_by(*transaction_order_by(sort_field=sort_field, sort_direction=sort_direction))
            .offset(page.offset)
            .limit(page.page_size)
        ).all()
        uncategorized = self._display.uncategorized_display(user_id)
        return PageResult(
            items=[
                self._display.to_transaction_with_category(
                    transaction=transaction,
                    category_id=category_id_value,
                    category_name=category_name,
                    category_color=category_color,
                    category_is_active=category_is_active,
                    category_deleted_at=category_deleted_at,
                    uncategorized=uncategorized,
                )
                for transaction, category_id_value, category_name, category_color, category_is_active, category_deleted_at in rows
            ],
            total=total,
            page=page.page,
            page_size=page.page_size,
        )

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
        filters = self._filters.build(
            user_id=user_id,
            keyword=keyword,
            category_id=category_id,
            date_from=date_from,
            date_to=date_to,
        )
        statement = (
            select(
                TransactionModel,
                CategoryModel.id,
                CategoryModel.name,
                CategoryModel.color,
                CategoryModel.is_active,
                CategoryModel.deleted_at,
            )
            .join(CategoryModel, TransactionModel.category_id == CategoryModel.id, isouter=True)
            .where(*filters)
            .order_by(*recent_transaction_order_by())
        )
        if limit is not None:
            statement = statement.limit(limit)

        uncategorized = self._display.uncategorized_display(user_id)
        return [
            self._display.to_transaction_with_category(
                transaction=transaction,
                category_id=category_id_value,
                category_name=category_name,
                category_color=category_color,
                category_is_active=category_is_active,
                category_deleted_at=category_deleted_at,
                uncategorized=uncategorized,
            )
            for transaction, category_id_value, category_name, category_color, category_is_active, category_deleted_at in self._session.execute(statement).all()
        ]

    def find_category_id_for_shop(
        self,
        *,
        user_id: UUID,
        shop_name: str,
        card_user_name: str | None,
        payment_method: str | None,
    ) -> UUID | None:
        # 自動分類は直近の同一店舗・同一利用者・同一支払方法の分類を再利用する。
        filters = [
            TransactionModel.user_id == str(user_id),
            TransactionModel.shop_name == shop_name,
            TransactionModel.deleted_at.is_(None),
        ]
        if card_user_name:
            filters.append(TransactionModel.card_user_name == card_user_name)
        if payment_method:
            filters.append(TransactionModel.payment_method == payment_method)
        row = self._session.scalar(
            select(TransactionModel)
            .where(*filters)
            .order_by(*recent_transaction_order_by())
            .limit(1)
        )
        return UUID(row.category_id) if row else None
