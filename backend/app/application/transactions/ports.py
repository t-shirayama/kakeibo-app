from __future__ import annotations

from datetime import date
from typing import Protocol
from uuid import UUID

from app.application.common import Page, PageResult
from app.application.transaction_views import TransactionWithCategory
from app.domain.entities import Category, Transaction


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
