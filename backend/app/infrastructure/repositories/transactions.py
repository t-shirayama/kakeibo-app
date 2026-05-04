from __future__ import annotations

from datetime import UTC, date, datetime
from uuid import UUID, uuid4

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.application.common import Page, PageResult
from app.application.transaction_views import TransactionWithCategory
from app.domain.entities import Category, Transaction, TransactionType
from app.domain.value_objects import MoneyJPY
from app.infrastructure.models.audit_log import AuditLogModel
from app.infrastructure.models.category import CategoryModel
from app.infrastructure.models.transaction import TransactionModel


class TransactionRepository:
    # 明細の保存と更新だけを担当し、一覧検索やカテゴリ表示の都合は持ち込まない。
    def __init__(self, session: Session) -> None:
        self._session = session

    def next_id(self) -> UUID:
        return uuid4()

    def create_transaction(self, transaction: Transaction) -> Transaction:
        model = TransactionModel(
            id=str(transaction.id),
            user_id=str(transaction.user_id),
            category_id=str(transaction.category_id),
            transaction_date=transaction.transaction_date,
            shop_name=transaction.shop_name,
            amount=transaction.amount.amount,
            transaction_type=transaction.transaction_type.value,
            payment_method=transaction.payment_method,
            card_user_name=transaction.card_user_name,
            memo=transaction.memo,
            source_upload_id=str(transaction.source_upload_id) if transaction.source_upload_id else None,
            source_file_name=transaction.source_file_name,
            source_row_number=transaction.source_row_number,
            source_page_number=transaction.source_page_number,
            source_format=transaction.source_format,
            source_hash=transaction.source_hash,
        )
        self._session.add(model)
        self._session.commit()
        self._session.refresh(model)
        return _to_transaction(model)

    def source_hash_exists(self, *, user_id: UUID, source_hash: str) -> bool:
        count = self._session.scalar(
            select(func.count())
            .select_from(TransactionModel)
            .where(
                TransactionModel.user_id == str(user_id),
                TransactionModel.source_hash == source_hash,
                TransactionModel.deleted_at.is_(None),
            )
        )
        return bool(count)

    def get_transaction(self, *, user_id: UUID, transaction_id: UUID) -> Transaction | None:
        model = self._session.scalar(
            select(TransactionModel).where(
                TransactionModel.id == str(transaction_id),
                TransactionModel.user_id == str(user_id),
                TransactionModel.deleted_at.is_(None),
            )
        )
        return _to_transaction(model) if model else None

    def update_transaction(self, transaction: Transaction) -> Transaction:
        model = self._session.get(TransactionModel, str(transaction.id))
        if model is None or model.deleted_at is not None:
            raise ValueError("Transaction not found.")
        model.category_id = str(transaction.category_id)
        model.transaction_date = transaction.transaction_date
        model.shop_name = transaction.shop_name
        model.card_user_name = transaction.card_user_name
        model.amount = transaction.amount.amount
        model.transaction_type = transaction.transaction_type.value
        model.payment_method = transaction.payment_method
        model.memo = transaction.memo
        model.updated_at = datetime.now(UTC)
        self._session.commit()
        self._session.refresh(model)
        return _to_transaction(model)

    def count_other_transactions_by_shop(self, *, user_id: UUID, transaction_id: UUID, shop_name: str) -> int:
        count = self._session.scalar(
            select(func.count())
            .select_from(TransactionModel)
            .where(
                TransactionModel.user_id == str(user_id),
                TransactionModel.id != str(transaction_id),
                TransactionModel.shop_name == shop_name,
                TransactionModel.deleted_at.is_(None),
            )
        )
        return count or 0

    def update_category_for_shop(
        self,
        *,
        user_id: UUID,
        shop_name: str,
        category_id: UUID,
        excluding_transaction_id: UUID,
    ) -> int:
        rows = self._session.scalars(
            select(TransactionModel).where(
                TransactionModel.user_id == str(user_id),
                TransactionModel.id != str(excluding_transaction_id),
                TransactionModel.shop_name == shop_name,
                TransactionModel.deleted_at.is_(None),
            )
        ).all()
        now = datetime.now(UTC)
        for row in rows:
            row.category_id = str(category_id)
            row.updated_at = now
        self._session.commit()
        return len(rows)

    def soft_delete_transaction(self, *, user_id: UUID, transaction_id: UUID) -> None:
        model = self._session.scalar(
            select(TransactionModel).where(
                TransactionModel.id == str(transaction_id),
                TransactionModel.user_id == str(user_id),
                TransactionModel.deleted_at.is_(None),
            )
        )
        if model is None:
            return
        model.deleted_at = datetime.now(UTC)
        model.updated_at = model.deleted_at
        self._session.commit()


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
            transaction=_to_transaction(transaction),
            display_category_id=display_category_id,
            category_name=display_name,
            category_color=display_color,
        )


class CategoryRepository:
    # カテゴリ集約の保存と取得に責務を絞り、明細一覧ルールは持ち込まない。
    def __init__(self, session: Session) -> None:
        self._session = session

    def next_id(self) -> UUID:
        return uuid4()

    def list_categories(self, *, user_id: UUID, include_inactive: bool = False) -> list[Category]:
        filters = [CategoryModel.user_id == str(user_id), CategoryModel.deleted_at.is_(None)]
        if not include_inactive:
            filters.append(CategoryModel.is_active.is_(True))
        rows = self._session.scalars(select(CategoryModel).where(*filters).order_by(CategoryModel.name.asc())).all()
        return [_to_category(row) for row in rows]

    def get_category(self, *, user_id: UUID, category_id: UUID) -> Category | None:
        model = self._session.scalar(
            select(CategoryModel).where(
                CategoryModel.id == str(category_id),
                CategoryModel.user_id == str(user_id),
                CategoryModel.deleted_at.is_(None),
            )
        )
        return _to_category(model) if model else None

    def category_name_exists(self, *, user_id: UUID, name: str) -> bool:
        count = self._session.scalar(
            select(func.count())
            .select_from(CategoryModel)
            .where(
                CategoryModel.user_id == str(user_id),
                func.lower(CategoryModel.name) == name.casefold(),
                CategoryModel.deleted_at.is_(None),
            )
        )
        return bool(count)

    def create_category(self, category: Category) -> Category:
        model = CategoryModel(
            id=str(category.id),
            user_id=str(category.user_id),
            name=category.name,
            color=category.color,
            description=category.description,
            is_active=category.is_active,
        )
        self._session.add(model)
        self._session.commit()
        self._session.refresh(model)
        return _to_category(model)

    def update_category(self, category: Category) -> Category:
        model = self._session.get(CategoryModel, str(category.id))
        if model is None or model.deleted_at is not None:
            raise ValueError("Category not found.")
        model.name = category.name
        model.color = category.color
        model.description = category.description
        model.is_active = category.is_active
        model.updated_at = datetime.now(UTC)
        self._session.commit()
        self._session.refresh(model)
        return _to_category(model)

    def set_category_active(self, *, user_id: UUID, category_id: UUID, is_active: bool) -> Category:
        model = self._session.scalar(
            select(CategoryModel).where(
                CategoryModel.id == str(category_id),
                CategoryModel.user_id == str(user_id),
                CategoryModel.deleted_at.is_(None),
            )
        )
        if model is None:
            raise ValueError("Category not found.")
        model.is_active = is_active
        model.updated_at = datetime.now(UTC)
        self._session.commit()
        self._session.refresh(model)
        return _to_category(model)

    def deactivate_category(self, *, user_id: UUID, category_id: UUID) -> None:
        model = self._session.scalar(
            select(CategoryModel).where(
                CategoryModel.id == str(category_id),
                CategoryModel.user_id == str(user_id),
                CategoryModel.deleted_at.is_(None),
            )
        )
        if model is None:
            return
        model.is_active = False
        model.deleted_at = datetime.now(UTC)
        model.updated_at = model.deleted_at
        self._session.commit()

    def get_uncategorized_category_id(self, user_id: UUID) -> UUID | None:
        model = self._session.scalar(
            select(CategoryModel).where(
                CategoryModel.user_id == str(user_id),
                CategoryModel.name == "未分類",
                CategoryModel.deleted_at.is_(None),
            )
        )
        return UUID(model.id) if model else None

    def create_uncategorized_category(self, user_id: UUID) -> UUID:
        category = self.create_category(
            Category(
                id=self.next_id(),
                user_id=user_id,
                name="未分類",
                color="#6B7280",
                description="取込直後や分類未確定の明細",
            )
        )
        return category.id


class AuditLogRepository:
    # 監査ログの永続化だけを担当し、明細やカテゴリの業務判断は持ち込まない。
    def __init__(self, session: Session) -> None:
        self._session = session

    def create_audit_log(
        self,
        *,
        user_id: UUID,
        action: str,
        resource_type: str,
        resource_id: UUID,
        details: dict[str, object],
    ) -> None:
        self._session.add(
            AuditLogModel(
                user_id=str(user_id),
                action=action,
                resource_type=resource_type,
                resource_id=str(resource_id),
                details=details,
            )
        )
        self._session.commit()


def _to_transaction(model: TransactionModel) -> Transaction:
    return Transaction(
        id=UUID(model.id),
        user_id=UUID(model.user_id),
        category_id=UUID(model.category_id),
        transaction_date=model.transaction_date,
        shop_name=model.shop_name,
        amount=MoneyJPY(model.amount),
        transaction_type=TransactionType(model.transaction_type),
        payment_method=model.payment_method,
        card_user_name=model.card_user_name,
        memo=model.memo,
        source_upload_id=UUID(model.source_upload_id) if model.source_upload_id else None,
        source_file_name=model.source_file_name,
        source_row_number=model.source_row_number,
        source_page_number=model.source_page_number,
        source_format=model.source_format,
        source_hash=model.source_hash,
    )


def _to_category(model: CategoryModel) -> Category:
    return Category(
        id=UUID(model.id),
        user_id=UUID(model.user_id),
        name=model.name,
        color=model.color,
        description=model.description,
        is_active=model.is_active,
    )
