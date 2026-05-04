from __future__ import annotations

from datetime import date
from io import BytesIO
from uuid import UUID, uuid4
from zipfile import ZipFile

from app.application.common import Page, PageResult
from app.application.exporting.transaction_workbook_exporter import TransactionWorkbookExporter
from app.application.reports import ReportUseCases, TransactionExportFilters
from app.application.transactions import CategoryCommand, CategoryUseCases, TransactionCommand, TransactionUseCases
from app.application.transaction_views import TransactionWithCategory
from app.domain.entities import Category, Transaction, TransactionType
from app.domain.value_objects import MoneyJPY


USER_ID = UUID("11111111-1111-1111-1111-111111111111")
UNCATEGORIZED_ID = UUID("22222222-2222-2222-2222-222222222222")
FOOD_ID = UUID("33333333-3333-3333-3333-333333333333")
DAILY_ID = UUID("44444444-4444-4444-4444-444444444444")


class FakeFinanceRepository:
    # ユースケースの業務判断だけを検証するため、DBを使わない最小のリポジトリを用意する。
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
            DAILY_ID: Category(
                id=DAILY_ID,
                user_id=USER_ID,
                name="日用品",
                color="#8B5CF6",
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
        items = [
            self._to_row(transaction)
            for transaction in self.transactions.values()
            if transaction.user_id == user_id
        ]
        if keyword:
            normalized_keyword = keyword.casefold()
            items = [
                row
                for row in items
                if normalized_keyword in row.transaction.shop_name.casefold()
                or normalized_keyword in (row.transaction.memo or "").casefold()
                or normalized_keyword in row.category_name.casefold()
                or (normalized_keyword == "未分類" and row.category_name == "未分類")
            ]
        if category_id:
            items = [row for row in items if row.display_category_id == category_id]
        if date_from:
            items = [row for row in items if row.transaction.transaction_date >= date_from]
        if date_to:
            items = [row for row in items if row.transaction.transaction_date <= date_to]
        return PageResult(items=items, total=len(items), page=page.page, page_size=page.page_size)

    def list_transactions_with_categories(self, *, user_id: UUID, keyword=None, category_id=None, date_from=None, date_to=None, limit=None):
        rows = []
        for transaction in self.transactions.values():
            if transaction.user_id != user_id:
                continue
            row = self._to_row(transaction)
            if keyword:
                normalized_keyword = keyword.casefold()
                if (
                    normalized_keyword not in transaction.shop_name.casefold()
                    and normalized_keyword not in (transaction.memo or "").casefold()
                    and normalized_keyword not in row.category_name.casefold()
                ):
                    continue
            if category_id and row.display_category_id != category_id:
                continue
            if date_from and transaction.transaction_date < date_from:
                continue
            if date_to and transaction.transaction_date > date_to:
                continue
            rows.append(row)
        rows.sort(key=lambda row: row.transaction.transaction_date, reverse=True)
        return rows[:limit] if limit is not None else rows

    def create_transaction(self, transaction: Transaction) -> Transaction:
        self.transactions[transaction.id] = transaction
        return transaction

    def source_hash_exists(self, *, user_id: UUID, source_hash: str) -> bool:
        return any(
            transaction.user_id == user_id and transaction.source_hash == source_hash
            for transaction in self.transactions.values()
        )

    def get_transaction(self, *, user_id: UUID, transaction_id: UUID) -> Transaction | None:
        transaction = self.transactions.get(transaction_id)
        return transaction if transaction and transaction.user_id == user_id else None

    def update_transaction(self, transaction: Transaction) -> Transaction:
        self.transactions[transaction.id] = transaction
        return transaction

    def count_other_transactions_by_shop(self, *, user_id: UUID, transaction_id: UUID, shop_name: str) -> int:
        return sum(
            1
            for transaction in self.transactions.values()
            if transaction.user_id == user_id and transaction.id != transaction_id and transaction.shop_name == shop_name
        )

    def update_category_for_shop(
        self,
        *,
        user_id: UUID,
        shop_name: str,
        category_id: UUID,
        excluding_transaction_id: UUID,
    ) -> int:
        updated_count = 0
        for transaction in list(self.transactions.values()):
            if transaction.user_id != user_id or transaction.id == excluding_transaction_id or transaction.shop_name != shop_name:
                continue
            self.transactions[transaction.id] = Transaction(
                id=transaction.id,
                user_id=transaction.user_id,
                category_id=category_id,
                transaction_date=transaction.transaction_date,
                shop_name=transaction.shop_name,
                amount=transaction.amount,
                transaction_type=transaction.transaction_type,
                payment_method=transaction.payment_method,
                card_user_name=transaction.card_user_name,
                memo=transaction.memo,
                source_upload_id=transaction.source_upload_id,
                source_file_name=transaction.source_file_name,
                source_row_number=transaction.source_row_number,
                source_page_number=transaction.source_page_number,
                source_format=transaction.source_format,
                source_hash=transaction.source_hash,
            )
            updated_count += 1
        return updated_count

    def soft_delete_transaction(self, *, user_id: UUID, transaction_id: UUID) -> None:
        self.transactions.pop(transaction_id, None)

    def list_categories(self, *, user_id: UUID, include_inactive: bool = False) -> list[Category]:
        if include_inactive:
            return list(self.categories.values())
        return [category for category in self.categories.values() if category.is_active]

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

    def _to_row(self, transaction: Transaction) -> TransactionWithCategory:
        category = self.categories[transaction.category_id]
        return TransactionWithCategory(
            transaction=transaction,
            display_category_id=category.id,
            category_name=category.name,
            category_color=category.color,
        )


def make_command(shop_name: str = "Store", category_id: UUID | None = None) -> TransactionCommand:
    return TransactionCommand(
        transaction_date=date(2026, 5, 1),
        shop_name=shop_name,
        amount=1200,
        transaction_type=TransactionType.EXPENSE,
        category_id=category_id,
        payment_method="credit",
    )


def make_transaction_use_cases(repository: FakeFinanceRepository) -> TransactionUseCases:
    return TransactionUseCases(
        transaction_repository=repository,
        transaction_query_repository=repository,
        category_repository=repository,
        audit_log_repository=repository,
    )


def make_category_use_cases(repository: FakeFinanceRepository) -> CategoryUseCases:
    return CategoryUseCases(category_repository=repository)


def make_report_use_cases(repository: FakeFinanceRepository) -> ReportUseCases:
    return ReportUseCases(repository, TransactionWorkbookExporter())


def test_create_transaction_falls_back_to_uncategorized() -> None:
    # カテゴリ推定できない明細は、登録失敗ではなく未分類へ入ることを確認する。
    repository = FakeFinanceRepository()
    use_cases = make_transaction_use_cases(repository)

    transaction = use_cases.create_transaction(user_id=USER_ID, command=make_command())

    assert transaction.category_id == UNCATEGORIZED_ID


def test_create_transaction_reuses_past_category_for_same_shop() -> None:
    # 同一店舗の過去分類を使い、PDF取込後の手動分類が次回に反映されることを守る。
    repository = FakeFinanceRepository()
    use_cases = make_transaction_use_cases(repository)

    use_cases.create_transaction(user_id=USER_ID, command=make_command(shop_name="Cafe", category_id=FOOD_ID))
    inferred = use_cases.create_transaction(user_id=USER_ID, command=make_command(shop_name="Cafe"))

    assert inferred.category_id == FOOD_ID


def test_delete_transaction_records_audit_log() -> None:
    repository = FakeFinanceRepository()
    use_cases = make_transaction_use_cases(repository)
    transaction = use_cases.create_transaction(user_id=USER_ID, command=make_command(category_id=FOOD_ID))

    use_cases.delete_transaction(user_id=USER_ID, transaction_id=transaction.id)

    assert ("transaction.deleted", transaction.id) in repository.audit_logs


def test_category_can_be_disabled_and_enabled() -> None:
    repository = FakeFinanceRepository()
    use_cases = make_category_use_cases(repository)

    disabled = use_cases.set_category_active(user_id=USER_ID, category_id=FOOD_ID, is_active=False)
    enabled = use_cases.set_category_active(user_id=USER_ID, category_id=FOOD_ID, is_active=True)

    assert disabled.is_active is False
    assert enabled.is_active is True


def test_update_category_changes_name_color_and_description() -> None:
    repository = FakeFinanceRepository()
    use_cases = make_category_use_cases(repository)

    category = use_cases.update_category(
        user_id=USER_ID,
        category_id=FOOD_ID,
        command=CategoryCommand(name="外食", color="#123456", description="外食費"),
    )

    assert category.name == "外食"
    assert category.color == "#123456"
    assert category.description == "外食費"
    assert category.is_active is True


def test_update_same_shop_category_updates_other_matching_shop_transactions_only() -> None:
    repository = FakeFinanceRepository()
    use_cases = make_transaction_use_cases(repository)
    target = use_cases.create_transaction(user_id=USER_ID, command=make_command(shop_name="Cafe", category_id=FOOD_ID))
    same_shop = use_cases.create_transaction(user_id=USER_ID, command=make_command(shop_name="Cafe", category_id=FOOD_ID))
    other_shop = use_cases.create_transaction(user_id=USER_ID, command=make_command(shop_name="Market", category_id=FOOD_ID))

    candidate_count = use_cases.count_same_shop_candidates(user_id=USER_ID, transaction_id=target.id)
    updated_count = use_cases.update_same_shop_category(
        user_id=USER_ID,
        transaction_id=target.id,
        shop_name=target.shop_name,
        category_id=DAILY_ID,
    )

    assert candidate_count == 1
    assert updated_count == 1
    assert repository.transactions[target.id].category_id == FOOD_ID
    assert repository.transactions[same_shop.id].category_id == DAILY_ID
    assert repository.transactions[other_shop.id].category_id == FOOD_ID
    assert ("transaction.same_shop_category_updated", target.id) in repository.audit_logs


def test_monthly_report_summarizes_expenses_by_category() -> None:
    repository = FakeFinanceRepository()
    transaction_use_cases = make_transaction_use_cases(repository)
    report_use_cases = make_report_use_cases(repository)
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
    repository = FakeFinanceRepository()
    transaction_use_cases = make_transaction_use_cases(repository)
    report_use_cases = make_report_use_cases(repository)
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
    assert [item.period for item in summary.monthly_summaries] == [
        "2025-12",
        "2026-01",
        "2026-02",
        "2026-03",
        "2026-04",
        "2026-05",
    ]
    assert summary.monthly_summaries[-1].total_expense == 1200


def test_report_export_workbook_contains_required_sheets() -> None:
    # Excel仕様として求められる3シートが生成物に含まれることを確認する。
    repository = FakeFinanceRepository()
    transaction_use_cases = make_transaction_use_cases(repository)
    report_use_cases = make_report_use_cases(repository)
    transaction_use_cases.create_transaction(user_id=USER_ID, command=make_command(category_id=FOOD_ID))

    workbook = report_use_cases.export_workbook(user_id=USER_ID)

    with ZipFile(BytesIO(workbook)) as archive:
        workbook_xml = archive.read("xl/workbook.xml").decode("utf-8")

    assert "明細一覧" in workbook_xml
    assert "カテゴリ集計" in workbook_xml
    assert "月別集計" in workbook_xml


def test_report_export_workbook_filters_transactions_by_search_conditions() -> None:
    repository = FakeFinanceRepository()
    transaction_use_cases = make_transaction_use_cases(repository)
    report_use_cases = make_report_use_cases(repository)
    transaction_use_cases.create_transaction(
        user_id=USER_ID,
        command=TransactionCommand(
            transaction_date=date(2026, 4, 10),
            shop_name="Amazon.co.jp",
            amount=4600,
            transaction_type=TransactionType.EXPENSE,
            category_id=DAILY_ID,
        ),
    )
    transaction_use_cases.create_transaction(
        user_id=USER_ID,
        command=TransactionCommand(
            transaction_date=date(2026, 5, 10),
            shop_name="成城石井",
            amount=3200,
            transaction_type=TransactionType.EXPENSE,
            category_id=FOOD_ID,
        ),
    )

    workbook = report_use_cases.export_workbook(
        user_id=USER_ID,
        filters=TransactionExportFilters(
            keyword="Amazon",
            category_id=DAILY_ID,
            date_from=date(2026, 4, 1),
            date_to=date(2026, 4, 30),
        ),
    )

    with ZipFile(BytesIO(workbook)) as archive:
        workbook_text = "\n".join(
            archive.read(name).decode("utf-8")
            for name in archive.namelist()
            if name.endswith(".xml")
        )

    assert "Amazon.co.jp" in workbook_text
    assert "成城石井" not in workbook_text
