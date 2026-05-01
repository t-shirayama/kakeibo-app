from __future__ import annotations

from datetime import date
from uuid import UUID, uuid4

from app.application.common import Page, PageResult
from app.application.transactions import TransactionCategoryUseCases, TransactionCommand
from app.domain.entities import Category, Transaction, TransactionType
from app.domain.value_objects import MoneyJPY


USER_ID = UUID("11111111-1111-1111-1111-111111111111")
UNCATEGORIZED_ID = UUID("22222222-2222-2222-2222-222222222222")
FOOD_ID = UUID("33333333-3333-3333-3333-333333333333")


class FakeTransactionCategoryRepository:
    def __init__(self) -> None:
        self.categories = {
            UNCATEGORIZED_ID: Category(
                id=UNCATEGORIZED_ID,
                user_id=USER_ID,
                name="未分類",
                color="#6B7280",
            ),
            FOOD_ID: Category(
                id=FOOD_ID,
                user_id=USER_ID,
                name="食費",
                color="#EF4444",
            ),
        }
        self.transactions: dict[UUID, Transaction] = {}
        self.audit_logs: list[tuple[str, UUID]] = []

    def next_id(self) -> UUID:
        return uuid4()

    def list_transactions(self, *, user_id: UUID, page: Page, keyword: str | None = None, category_id: UUID | None = None):
        items = [transaction for transaction in self.transactions.values() if transaction.user_id == user_id]
        return PageResult(items=items, total=len(items), page=page.page, page_size=page.page_size)

    def create_transaction(self, transaction: Transaction) -> Transaction:
        self.transactions[transaction.id] = transaction
        return transaction

    def get_transaction(self, *, user_id: UUID, transaction_id: UUID) -> Transaction | None:
        transaction = self.transactions.get(transaction_id)
        return transaction if transaction and transaction.user_id == user_id else None

    def update_transaction(self, transaction: Transaction) -> Transaction:
        self.transactions[transaction.id] = transaction
        return transaction

    def soft_delete_transaction(self, *, user_id: UUID, transaction_id: UUID) -> None:
        self.transactions.pop(transaction_id, None)

    def list_categories(self, *, user_id: UUID, include_inactive: bool = False) -> list[Category]:
        return list(self.categories.values())

    def get_category(self, *, user_id: UUID, category_id: UUID) -> Category | None:
        return self.categories.get(category_id)

    def category_name_exists(self, *, user_id: UUID, name: str) -> bool:
        return any(category.name.casefold() == name.casefold() for category in self.categories.values())

    def create_category(self, category: Category) -> Category:
        self.categories[category.id] = category
        return category

    def update_category(self, category: Category) -> Category:
        self.categories[category.id] = category
        return category

    def deactivate_category(self, *, user_id: UUID, category_id: UUID) -> None:
        category = self.categories[category_id]
        self.categories[category_id] = category.deactivate()

    def get_uncategorized_category_id(self, user_id: UUID) -> UUID | None:
        return UNCATEGORIZED_ID

    def create_uncategorized_category(self, user_id: UUID) -> UUID:
        return UNCATEGORIZED_ID

    def find_category_id_for_shop(
        self,
        *,
        user_id: UUID,
        shop_name: str,
        card_user_name: str | None,
        payment_method: str | None,
    ) -> UUID | None:
        for transaction in self.transactions.values():
            if transaction.shop_name == shop_name:
                return transaction.category_id
        return None

    def create_audit_log(
        self,
        *,
        user_id: UUID,
        action: str,
        resource_type: str,
        resource_id: UUID,
        details: dict[str, object],
    ) -> None:
        self.audit_logs.append((action, resource_id))


def make_command(shop_name: str = "Store", category_id: UUID | None = None) -> TransactionCommand:
    return TransactionCommand(
        transaction_date=date(2026, 5, 1),
        shop_name=shop_name,
        amount=1200,
        transaction_type=TransactionType.EXPENSE,
        category_id=category_id,
        payment_method="credit",
    )


def test_create_transaction_falls_back_to_uncategorized() -> None:
    repository = FakeTransactionCategoryRepository()
    use_cases = TransactionCategoryUseCases(repository)  # type: ignore[arg-type]

    transaction = use_cases.create_transaction(user_id=USER_ID, command=make_command())

    assert transaction.category_id == UNCATEGORIZED_ID


def test_create_transaction_reuses_past_category_for_same_shop() -> None:
    repository = FakeTransactionCategoryRepository()
    use_cases = TransactionCategoryUseCases(repository)  # type: ignore[arg-type]

    use_cases.create_transaction(user_id=USER_ID, command=make_command(shop_name="Cafe", category_id=FOOD_ID))
    inferred = use_cases.create_transaction(user_id=USER_ID, command=make_command(shop_name="Cafe"))

    assert inferred.category_id == FOOD_ID


def test_delete_transaction_records_audit_log() -> None:
    repository = FakeTransactionCategoryRepository()
    use_cases = TransactionCategoryUseCases(repository)  # type: ignore[arg-type]
    transaction = use_cases.create_transaction(user_id=USER_ID, command=make_command(category_id=FOOD_ID))

    use_cases.delete_transaction(user_id=USER_ID, transaction_id=transaction.id)

    assert ("transaction.deleted", transaction.id) in repository.audit_logs
