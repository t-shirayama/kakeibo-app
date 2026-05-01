from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.application.common import Page, PageResult
from app.domain.entities import Category, Transaction, TransactionType
from app.domain.value_objects import MoneyJPY
from app.infrastructure.models.audit_log import AuditLogModel
from app.infrastructure.models.category import CategoryModel
from app.infrastructure.models.transaction import TransactionModel


class TransactionCategoryRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def next_id(self) -> UUID:
        return uuid4()

    def list_transactions(
        self,
        *,
        user_id: UUID,
        page: Page,
        keyword: str | None = None,
        category_id: UUID | None = None,
    ) -> PageResult[Transaction]:
        filters = [TransactionModel.user_id == str(user_id), TransactionModel.deleted_at.is_(None)]
        if keyword:
            pattern = f"%{keyword}%"
            filters.append(or_(TransactionModel.shop_name.like(pattern), TransactionModel.memo.like(pattern)))
        if category_id:
            filters.append(TransactionModel.category_id == str(category_id))

        total = self._session.scalar(select(func.count()).select_from(TransactionModel).where(*filters)) or 0
        rows = self._session.scalars(
            select(TransactionModel)
            .where(*filters)
            .order_by(TransactionModel.transaction_date.desc(), TransactionModel.created_at.desc())
            .offset(page.offset)
            .limit(page.page_size)
        ).all()
        return PageResult(
            items=[self._to_transaction(row) for row in rows],
            total=total,
            page=page.page,
            page_size=page.page_size,
        )

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
        return self._to_transaction(model)

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
        return self._to_transaction(model) if model else None

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
        return self._to_transaction(model)

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

    def list_categories(self, *, user_id: UUID, include_inactive: bool = False) -> list[Category]:
        filters = [CategoryModel.user_id == str(user_id), CategoryModel.deleted_at.is_(None)]
        if not include_inactive:
            filters.append(CategoryModel.is_active.is_(True))
        rows = self._session.scalars(select(CategoryModel).where(*filters).order_by(CategoryModel.name.asc())).all()
        return [self._to_category(row) for row in rows]

    def get_category(self, *, user_id: UUID, category_id: UUID) -> Category | None:
        model = self._session.scalar(
            select(CategoryModel).where(
                CategoryModel.id == str(category_id),
                CategoryModel.user_id == str(user_id),
                CategoryModel.deleted_at.is_(None),
            )
        )
        return self._to_category(model) if model else None

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
        return self._to_category(model)

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
        return self._to_category(model)

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

    def find_category_id_for_shop(
        self,
        *,
        user_id: UUID,
        shop_name: str,
        card_user_name: str | None,
        payment_method: str | None,
    ) -> UUID | None:
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

    def _to_transaction(self, model: TransactionModel) -> Transaction:
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

    def _to_category(self, model: CategoryModel) -> Category:
        return Category(
            id=UUID(model.id),
            user_id=UUID(model.user_id),
            name=model.name,
            color=model.color,
            description=model.description,
            is_active=model.is_active,
        )
