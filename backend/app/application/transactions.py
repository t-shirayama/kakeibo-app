from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Protocol
from uuid import UUID

from app.application.common import Page, PageResult
from app.application.transaction_views import TransactionWithCategory
from app.domain.entities import Category, Transaction, TransactionType
from app.domain.value_objects import MoneyJPY


class TransactionCategoryError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class TransactionCommand:
    transaction_date: date
    shop_name: str
    amount: int
    transaction_type: TransactionType
    category_id: UUID | None = None
    payment_method: str | None = None
    card_user_name: str | None = None
    memo: str | None = None
    source_upload_id: UUID | None = None
    source_file_name: str | None = None
    source_row_number: int | None = None
    source_page_number: int | None = None
    source_format: str | None = None
    source_hash: str | None = None


@dataclass(frozen=True, slots=True)
class CategoryCommand:
    name: str
    color: str
    description: str | None = None


class TransactionRepositoryProtocol(Protocol):
    def next_id(self) -> UUID:
        raise NotImplementedError

    def create_transaction(self, transaction: Transaction) -> Transaction:
        raise NotImplementedError

    def source_hash_exists(self, *, user_id: UUID, source_hash: str) -> bool:
        raise NotImplementedError

    def get_transaction(self, *, user_id: UUID, transaction_id: UUID) -> Transaction | None:
        raise NotImplementedError

    def update_transaction(self, transaction: Transaction) -> Transaction:
        raise NotImplementedError

    def count_other_transactions_by_shop(self, *, user_id: UUID, transaction_id: UUID, shop_name: str) -> int:
        raise NotImplementedError

    def update_category_for_shop(
        self,
        *,
        user_id: UUID,
        shop_name: str,
        category_id: UUID,
        excluding_transaction_id: UUID,
    ) -> int:
        raise NotImplementedError

    def soft_delete_transaction(self, *, user_id: UUID, transaction_id: UUID) -> None:
        raise NotImplementedError


class TransactionQueryRepositoryProtocol(Protocol):
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
        raise NotImplementedError

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

    def find_category_id_for_shop(
        self,
        *,
        user_id: UUID,
        shop_name: str,
        card_user_name: str | None,
        payment_method: str | None,
    ) -> UUID | None:
        raise NotImplementedError


class CategoryRepositoryProtocol(Protocol):
    def next_id(self) -> UUID:
        raise NotImplementedError

    def list_categories(self, *, user_id: UUID, include_inactive: bool = False) -> list[Category]:
        raise NotImplementedError

    def get_category(self, *, user_id: UUID, category_id: UUID) -> Category | None:
        raise NotImplementedError

    def category_name_exists(self, *, user_id: UUID, name: str) -> bool:
        raise NotImplementedError

    def create_category(self, category: Category) -> Category:
        raise NotImplementedError

    def update_category(self, category: Category) -> Category:
        raise NotImplementedError

    def set_category_active(self, *, user_id: UUID, category_id: UUID, is_active: bool) -> Category:
        raise NotImplementedError

    def deactivate_category(self, *, user_id: UUID, category_id: UUID) -> None:
        raise NotImplementedError

    def get_uncategorized_category_id(self, user_id: UUID) -> UUID | None:
        raise NotImplementedError

    def create_uncategorized_category(self, user_id: UUID) -> UUID:
        raise NotImplementedError


class AuditLogRepositoryProtocol(Protocol):
    def create_audit_log(
        self,
        *,
        user_id: UUID,
        action: str,
        resource_type: str,
        resource_id: UUID,
        details: dict[str, object],
    ) -> None:
        raise NotImplementedError


class TransactionCategoryPolicy:
    # 分類候補の補完と有効カテゴリ検証だけを担当し、CRUD本体から業務判断を切り離す。
    def __init__(
        self,
        *,
        transaction_query_repository: TransactionQueryRepositoryProtocol,
        category_repository: CategoryRepositoryProtocol,
    ) -> None:
        self._transaction_query_repository = transaction_query_repository
        self._category_repository = category_repository

    def resolve_category_id_for_new_transaction(self, *, user_id: UUID, command: TransactionCommand) -> UUID:
        category_id = command.category_id or self._transaction_query_repository.find_category_id_for_shop(
            user_id=user_id,
            shop_name=command.shop_name,
            card_user_name=command.card_user_name,
            payment_method=command.payment_method,
        )
        category_id = category_id or self._category_repository.get_uncategorized_category_id(user_id)
        if category_id is None:
            # 初期カテゴリが欠けたデータでも、明細登録を止めずに最低限の分類先を用意する。
            category_id = self._category_repository.create_uncategorized_category(user_id)
        self.ensure_category_available(user_id=user_id, category_id=category_id)
        return category_id

    def ensure_category_available(self, *, user_id: UUID, category_id: UUID) -> None:
        # 無効化カテゴリへ新規・更新明細を紐づけると、未分類扱いの表示ルールと衝突する。
        category = self._category_repository.get_category(user_id=user_id, category_id=category_id)
        if category is None or not category.is_active:
            raise TransactionCategoryError("Category not found or inactive.")


class TransactionUseCases:
    # 明細操作のユースケースに責務を限定し、カテゴリ管理は別サービスへ分離する。
    def __init__(
        self,
        *,
        transaction_repository: TransactionRepositoryProtocol,
        transaction_query_repository: TransactionQueryRepositoryProtocol,
        category_repository: CategoryRepositoryProtocol,
        audit_log_repository: AuditLogRepositoryProtocol,
    ) -> None:
        self._transaction_repository = transaction_repository
        self._transaction_query_repository = transaction_query_repository
        self._category_repository = category_repository
        self._audit_log_repository = audit_log_repository
        self._policy = TransactionCategoryPolicy(
            transaction_query_repository=transaction_query_repository,
            category_repository=category_repository,
        )

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
        return self._transaction_query_repository.list_transactions(
            user_id=user_id,
            page=page,
            keyword=keyword,
            category_id=category_id,
            date_from=date_from,
            date_to=date_to,
            sort_field=sort_field,
            sort_direction=sort_direction,
        )

    def create_transaction(self, *, user_id: UUID, command: TransactionCommand) -> Transaction:
        # カテゴリ未指定時は過去の同一店舗分類を優先し、見つからなければ未分類へ落とす。
        category_id = self._policy.resolve_category_id_for_new_transaction(user_id=user_id, command=command)
        transaction = Transaction(
            id=self._transaction_repository.next_id(),
            user_id=user_id,
            category_id=category_id,
            transaction_date=command.transaction_date,
            shop_name=command.shop_name,
            amount=MoneyJPY(command.amount),
            transaction_type=command.transaction_type,
            payment_method=command.payment_method,
            card_user_name=command.card_user_name,
            memo=command.memo,
            source_upload_id=command.source_upload_id,
            source_file_name=command.source_file_name,
            source_row_number=command.source_row_number,
            source_page_number=command.source_page_number,
            source_format=command.source_format,
            source_hash=command.source_hash,
        )
        return self._transaction_repository.create_transaction(transaction)

    def get_transaction(self, *, user_id: UUID, transaction_id: UUID) -> Transaction:
        transaction = self._transaction_repository.get_transaction(user_id=user_id, transaction_id=transaction_id)
        if transaction is None:
            raise TransactionCategoryError("Transaction not found.")
        return transaction

    def update_transaction(self, *, user_id: UUID, transaction_id: UUID, command: TransactionCommand) -> Transaction:
        existing = self.get_transaction(user_id=user_id, transaction_id=transaction_id)
        category_id = command.category_id or existing.category_id
        self._policy.ensure_category_available(user_id=user_id, category_id=category_id)
        # PDF由来の情報は編集画面で変更しないため、既存明細から引き継ぐ。
        updated = Transaction(
            id=existing.id,
            user_id=existing.user_id,
            category_id=category_id,
            transaction_date=command.transaction_date,
            shop_name=command.shop_name,
            amount=MoneyJPY(command.amount),
            transaction_type=command.transaction_type,
            payment_method=command.payment_method,
            card_user_name=command.card_user_name,
            memo=command.memo,
            source_upload_id=existing.source_upload_id,
            source_file_name=existing.source_file_name,
            source_row_number=existing.source_row_number,
            source_page_number=existing.source_page_number,
            source_format=existing.source_format,
            source_hash=existing.source_hash,
        )
        transaction = self._transaction_repository.update_transaction(updated)
        self._audit_log_repository.create_audit_log(
            user_id=user_id,
            action="transaction.updated",
            resource_type="transaction",
            resource_id=transaction_id,
            details={"shop_name": transaction.shop_name, "amount": transaction.amount.amount},
        )
        return transaction

    def count_same_shop_candidates(self, *, user_id: UUID, transaction_id: UUID) -> int:
        transaction = self.get_transaction(user_id=user_id, transaction_id=transaction_id)
        return self._transaction_repository.count_other_transactions_by_shop(
            user_id=user_id,
            transaction_id=transaction_id,
            shop_name=transaction.shop_name,
        )

    def update_same_shop_category(self, *, user_id: UUID, transaction_id: UUID, shop_name: str, category_id: UUID) -> int:
        self.get_transaction(user_id=user_id, transaction_id=transaction_id)
        self._policy.ensure_category_available(user_id=user_id, category_id=category_id)
        updated_count = self._transaction_repository.update_category_for_shop(
            user_id=user_id,
            shop_name=shop_name,
            category_id=category_id,
            excluding_transaction_id=transaction_id,
        )
        self._audit_log_repository.create_audit_log(
            user_id=user_id,
            action="transaction.same_shop_category_updated",
            resource_type="transaction",
            resource_id=transaction_id,
            details={"shop_name": shop_name, "category_id": str(category_id), "updated_count": updated_count},
        )
        return updated_count

    def delete_transaction(self, *, user_id: UUID, transaction_id: UUID) -> None:
        self.get_transaction(user_id=user_id, transaction_id=transaction_id)
        self._transaction_repository.soft_delete_transaction(user_id=user_id, transaction_id=transaction_id)
        self._audit_log_repository.create_audit_log(
            user_id=user_id,
            action="transaction.deleted",
            resource_type="transaction",
            resource_id=transaction_id,
            details={},
        )


class CategoryUseCases:
    # カテゴリ管理のユースケースだけを担当し、明細更新の責務は持たない。
    def __init__(self, *, category_repository: CategoryRepositoryProtocol) -> None:
        self._category_repository = category_repository

    def list_categories(self, *, user_id: UUID, include_inactive: bool = False) -> list[Category]:
        return self._category_repository.list_categories(user_id=user_id, include_inactive=include_inactive)

    def create_category(self, *, user_id: UUID, command: CategoryCommand) -> Category:
        if self._category_repository.category_name_exists(user_id=user_id, name=command.name):
            raise TransactionCategoryError("Category name already exists.")
        return self._category_repository.create_category(
            Category(
                id=self._category_repository.next_id(),
                user_id=user_id,
                name=command.name,
                color=command.color,
                description=command.description,
            )
        )

    def update_category(self, *, user_id: UUID, category_id: UUID, command: CategoryCommand) -> Category:
        category = self._category_repository.get_category(user_id=user_id, category_id=category_id)
        if category is None:
            raise TransactionCategoryError("Category not found.")
        if category.name.casefold() != command.name.casefold() and self._category_repository.category_name_exists(
            user_id=user_id,
            name=command.name,
        ):
            raise TransactionCategoryError("Category name already exists.")
        return self._category_repository.update_category(
            Category(
                id=category.id,
                user_id=category.user_id,
                name=command.name,
                color=command.color,
                description=command.description,
                is_active=category.is_active,
            )
        )

    def set_category_active(self, *, user_id: UUID, category_id: UUID, is_active: bool) -> Category:
        category = self._category_repository.get_category(user_id=user_id, category_id=category_id)
        if category is None:
            raise TransactionCategoryError("Category not found.")
        return self._category_repository.set_category_active(user_id=user_id, category_id=category_id, is_active=is_active)

    def deactivate_category(self, *, user_id: UUID, category_id: UUID) -> None:
        category = self._category_repository.get_category(user_id=user_id, category_id=category_id)
        if category is None:
            raise TransactionCategoryError("Category not found.")
        self._category_repository.deactivate_category(user_id=user_id, category_id=category_id)
