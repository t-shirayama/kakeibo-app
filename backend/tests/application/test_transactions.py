from __future__ import annotations

from datetime import date
from io import BytesIO
from uuid import UUID, uuid4
from zipfile import ZipFile

from app.application.common import Page, PageResult
from app.application.reports import ReportUseCases, TransactionWithCategory
from app.application.transactions import CategoryCommand, TransactionCategoryUseCases, TransactionCommand
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

    def list_transactions(
        self,
        *,
        user_id: UUID,
        page: Page,
        keyword: str | None = None,
        category_id: UUID | None = None,
        date_from=None,
        date_to=None,
    ):
        items = [transaction for transaction in self.transactions.values() if transaction.user_id == user_id]
        if date_from:
            items = [transaction for transaction in items if transaction.transaction_date >= date_from]
        if date_to:
            items = [transaction for transaction in items if transaction.transaction_date <= date_to]
        return PageResult(items=items, total=len(items), page=page.page, page_size=page.page_size)

    def list_transactions_with_categories(self, *, user_id: UUID, start_date=None, end_date=None, limit=None):
        rows = []
        for transaction in self.transactions.values():
            if transaction.user_id != user_id:
                continue
            if start_date and transaction.transaction_date < start_date:
                continue
            if end_date and transaction.transaction_date > end_date:
                continue
            category = self.categories[transaction.category_id]
            rows.append(
                TransactionWithCategory(
                    transaction=transaction,
                    category_name=category.name,
                    category_color=category.color,
                )
            )
        rows.sort(key=lambda row: row.transaction.transaction_date, reverse=True)
        return rows[:limit] if limit is not None else rows

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

    def set_category_active(self, *, user_id: UUID, category_id: UUID, is_active: bool) -> Category:
        category = self.categories[category_id]
        updated = Category(
            id=category.id,
            user_id=category.user_id,
            name=category.name,
            color=category.color,
            description=category.description,
            is_active=is_active,
        )
        self.categories[category_id] = updated
        return updated

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


def test_category_can_be_disabled_and_enabled() -> None:
    repository = FakeTransactionCategoryRepository()
    use_cases = TransactionCategoryUseCases(repository)  # type: ignore[arg-type]

    disabled = use_cases.set_category_active(user_id=USER_ID, category_id=FOOD_ID, is_active=False)
    enabled = use_cases.set_category_active(user_id=USER_ID, category_id=FOOD_ID, is_active=True)

    assert disabled.is_active is False
    assert enabled.is_active is True


def test_update_category_changes_name_color_and_description() -> None:
    repository = FakeTransactionCategoryRepository()
    use_cases = TransactionCategoryUseCases(repository)  # type: ignore[arg-type]

    category = use_cases.update_category(
        user_id=USER_ID,
        category_id=FOOD_ID,
        command=CategoryCommand(name="外食", color="#123456", description="外食費"),
    )

    assert category.name == "外食"
    assert category.color == "#123456"
    assert category.description == "外食費"
    assert category.is_active is True


def test_monthly_report_summarizes_expenses_by_category() -> None:
    repository = FakeTransactionCategoryRepository()
    transaction_use_cases = TransactionCategoryUseCases(repository)  # type: ignore[arg-type]
    report_use_cases = ReportUseCases(repository)  # type: ignore[arg-type]
    transaction_use_cases.create_transaction(
        user_id=USER_ID,
        command=make_command(shop_name="Cafe", category_id=FOOD_ID),
    )
    transaction_use_cases.create_transaction(
        user_id=USER_ID,
        command=make_command(shop_name="Market", category_id=FOOD_ID),
    )

    report = report_use_cases.monthly_report(user_id=USER_ID, year=2026, month=5)

    assert report.total_expense == 2400
    assert report.average_daily_expense == 77
    assert report.max_category is not None
    assert report.max_category.name == "食費"
    assert report.category_summaries[0].ratio == 1


def test_dashboard_summary_compares_previous_month() -> None:
    repository = FakeTransactionCategoryRepository()
    transaction_use_cases = TransactionCategoryUseCases(repository)  # type: ignore[arg-type]
    report_use_cases = ReportUseCases(repository)  # type: ignore[arg-type]
    transaction_use_cases.create_transaction(user_id=USER_ID, command=make_command(category_id=FOOD_ID))
    transaction_use_cases.create_transaction(
        user_id=USER_ID,
        command=TransactionCommand(
            transaction_date=date(2026, 4, 1),
            shop_name="April Store",
            amount=500,
            transaction_type=TransactionType.EXPENSE,
            category_id=FOOD_ID,
        ),
    )

    summary = report_use_cases.dashboard_summary(user_id=USER_ID, year=2026, month=5)

    assert summary.total_expense == 1200
    assert summary.expense_change == 700
    assert summary.transaction_count == 1


def test_report_export_workbook_contains_required_sheets() -> None:
    repository = FakeTransactionCategoryRepository()
    transaction_use_cases = TransactionCategoryUseCases(repository)  # type: ignore[arg-type]
    report_use_cases = ReportUseCases(repository)  # type: ignore[arg-type]
    transaction_use_cases.create_transaction(user_id=USER_ID, command=make_command(category_id=FOOD_ID))

    workbook = report_use_cases.export_workbook(user_id=USER_ID)

    with ZipFile(BytesIO(workbook)) as archive:
        workbook_xml = archive.read("xl/workbook.xml").decode("utf-8")

    assert "明細一覧" in workbook_xml
    assert "カテゴリ集計" in workbook_xml
    assert "月別集計" in workbook_xml
