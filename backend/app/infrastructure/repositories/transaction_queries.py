from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.application.common import Page, PageResult
from app.application.transaction_views import TransactionWithCategory
from app.infrastructure.models.category import CategoryModel
from app.infrastructure.models.transaction import TransactionModel
from app.infrastructure.repositories.mappers import to_transaction


class TransactionQueryRepository:
    # 一覧検索と表示用カテゴリ解決を担当し、更新系の保存責務は持たない。
    def __init__(self, session: Session) -> None:
        self._session = session

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
        filters = self._build_transaction_filters(
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
            .order_by(*self._transaction_order_by(sort_field=sort_field, sort_direction=sort_direction))
            .offset(page.offset)
            .limit(page.page_size)
        ).all()
        uncategorized = self._get_uncategorized_category_display(user_id)
        return PageResult(
            items=[
                self._to_transaction_with_category(
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
        filters = self._build_transaction_filters(
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
            .order_by(TransactionModel.transaction_date.desc(), TransactionModel.created_at.desc())
        )
        if limit is not None:
            statement = statement.limit(limit)

        uncategorized = self._get_uncategorized_category_display(user_id)
        return [
            self._to_transaction_with_category(
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
            .order_by(TransactionModel.transaction_date.desc(), TransactionModel.created_at.desc())
            .limit(1)
        )
        return UUID(row.category_id) if row else None

    def _transaction_order_by(self, *, sort_field: str, sort_direction: str) -> tuple[object, ...]:
        descending = sort_direction != "asc"
        if sort_field == "amount":
            amount_order = TransactionModel.amount.desc() if descending else TransactionModel.amount.asc()
            date_order = TransactionModel.transaction_date.desc() if descending else TransactionModel.transaction_date.asc()
            created_order = TransactionModel.created_at.desc() if descending else TransactionModel.created_at.asc()
            return (amount_order, date_order, created_order)

        date_order = TransactionModel.transaction_date.desc() if descending else TransactionModel.transaction_date.asc()
        created_order = TransactionModel.created_at.desc() if descending else TransactionModel.created_at.asc()
        return (date_order, created_order)

    def _build_transaction_filters(
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
        if not self._is_uncategorized_category(user_id=user_id, category_id=category_id):
            return TransactionModel.category_id == str(category_id)

        unavailable_category_ids = select(CategoryModel.id).where(
            CategoryModel.user_id == str(user_id),
            CategoryModel.name != "未分類",
            or_(CategoryModel.is_active.is_(False), CategoryModel.deleted_at.is_not(None)),
        )
        return or_(
            TransactionModel.category_id == str(category_id),
            TransactionModel.category_id.in_(unavailable_category_ids),
        )

    def _keyword_filter(self, *, user_id: UUID, keyword: str):
        pattern = f"%{keyword}%"
        matching_category_ids = select(CategoryModel.id).where(
            CategoryModel.user_id == str(user_id),
            CategoryModel.deleted_at.is_(None),
            CategoryModel.name.like(pattern),
        )
        conditions = [
            TransactionModel.shop_name.like(pattern),
            TransactionModel.memo.like(pattern),
            TransactionModel.category_id.in_(matching_category_ids),
        ]
        if "未分類" in keyword:
            uncategorized_ids = select(CategoryModel.id).where(
                CategoryModel.user_id == str(user_id),
                CategoryModel.name == "未分類",
                CategoryModel.deleted_at.is_(None),
            )
            unavailable_category_ids = select(CategoryModel.id).where(
                CategoryModel.user_id == str(user_id),
                CategoryModel.name != "未分類",
                or_(CategoryModel.is_active.is_(False), CategoryModel.deleted_at.is_not(None)),
            )
            conditions.extend(
                [
                    TransactionModel.category_id.in_(uncategorized_ids),
                    TransactionModel.category_id.in_(unavailable_category_ids),
                ]
            )
        return or_(*conditions)

    def _is_uncategorized_category(self, *, user_id: UUID, category_id: UUID) -> bool:
        count = self._session.scalar(
            select(func.count())
            .select_from(CategoryModel)
            .where(
                CategoryModel.id == str(category_id),
                CategoryModel.user_id == str(user_id),
                CategoryModel.name == "未分類",
                CategoryModel.deleted_at.is_(None),
            )
        )
        return bool(count)

    def _get_uncategorized_category_display(self, user_id: UUID) -> tuple[UUID | None, str, str]:
        row = self._session.scalar(
            select(CategoryModel).where(
                CategoryModel.user_id == str(user_id),
                CategoryModel.name == "未分類",
                CategoryModel.deleted_at.is_(None),
            )
        )
        if row is None:
            return None, "未分類", "#6B7280"
        return UUID(row.id), row.name, row.color

    def _to_transaction_with_category(
        self,
        *,
        transaction: TransactionModel,
        category_id: str | None,
        category_name: str | None,
        category_color: str | None,
        category_is_active: bool | None,
        category_deleted_at: datetime | None,
        uncategorized: tuple[UUID | None, str, str],
    ) -> TransactionWithCategory:
        uncategorized_id, uncategorized_name, uncategorized_color = uncategorized
        is_display_uncategorized = (
            category_id is None
            or category_name is None
            or category_color is None
            or category_is_active is not True
            or category_deleted_at is not None
        )
        display_category_id = uncategorized_id or UUID(transaction.category_id)
        display_name = uncategorized_name
        display_color = uncategorized_color
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
