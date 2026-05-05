from __future__ import annotations

from datetime import UTC, date, datetime
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.application.auth.password_hasher import PasswordHasher
from app.application.auth.ports import UserRecord
from app.application.auth.token_hash import hash_token
from app.application.common import Page
from app.application.settings import SettingsUseCases
from app.domain.entities import Category, Transaction, TransactionType, UploadStatus
from app.domain.value_objects import MoneyJPY
from app.infrastructure.models.password_reset_token import PasswordResetTokenModel
from app.infrastructure.models.refresh_token import RefreshTokenModel
from app.infrastructure.models.upload import UploadModel
from app.infrastructure.models.user import UserModel
from app.infrastructure.repositories.auth import AuthRepository
from app.infrastructure.repositories.settings import SettingsRepository
from app.infrastructure.repositories.transactions import CategoryRepository, TransactionQueryRepository, TransactionRepository


USER_ID = UUID("11111111-1111-1111-1111-111111111111")


class FakeStorage:
    def __init__(self) -> None:
        self.deleted_paths: list[str] = []

    def delete(self, stored_file_path: str) -> None:
        self.deleted_paths.append(stored_file_path)


def add_user(session: Session, *, password_hash: str = "hash") -> None:
    session.add(
        UserModel(
            id=str(USER_ID),
            email="user@example.com",
            password_hash=password_hash,
            is_admin=False,
        )
    )
    session.commit()


def test_transaction_repository_creates_lists_and_soft_deletes(db_session: Session) -> None:
    add_user(db_session)
    transaction_repository = TransactionRepository(db_session)
    transaction_query_repository = TransactionQueryRepository(db_session)
    category_repository = CategoryRepository(db_session)
    category = category_repository.create_category(
        Category(id=uuid4(), user_id=USER_ID, name="食費", color="#EF4444")
    )

    transaction = transaction_repository.create_transaction(
        Transaction(
            id=uuid4(),
            user_id=USER_ID,
            category_id=category.id,
            transaction_date=date(2026, 5, 1),
            shop_name="Cafe",
            amount=MoneyJPY(1200),
            transaction_type=TransactionType.EXPENSE,
            source_hash="hash-1",
        )
    )

    result = transaction_query_repository.list_transactions(user_id=USER_ID, page=Page(page=1, page_size=10))
    assert result.total == 1
    assert result.items[0].transaction.shop_name == "Cafe"
    assert result.items[0].category_name == "食費"
    assert result.items[0].category_color == "#EF4444"
    assert transaction_repository.source_hash_exists(user_id=USER_ID, source_hash="hash-1")

    transaction_repository.soft_delete_transaction(user_id=USER_ID, transaction_id=transaction.id)
    assert transaction_query_repository.list_transactions(user_id=USER_ID, page=Page(page=1, page_size=10)).total == 0


def test_transaction_repository_filters_by_transaction_date(db_session: Session) -> None:
    add_user(db_session)
    transaction_repository = TransactionRepository(db_session)
    transaction_query_repository = TransactionQueryRepository(db_session)
    category_repository = CategoryRepository(db_session)
    category = category_repository.create_category(Category(id=uuid4(), user_id=USER_ID, name="食費", color="#EF4444"))

    for transaction_date, shop_name in [(date(2026, 5, 1), "May Cafe"), (date(2026, 4, 30), "April Market")]:
        transaction_repository.create_transaction(
            Transaction(
                id=uuid4(),
                user_id=USER_ID,
                category_id=category.id,
                transaction_date=transaction_date,
                shop_name=shop_name,
                amount=MoneyJPY(1200),
                transaction_type=TransactionType.EXPENSE,
            )
        )

    result = transaction_query_repository.list_transactions(
        user_id=USER_ID,
        page=Page(page=1, page_size=10),
        date_from=date(2026, 5, 1),
        date_to=date(2026, 5, 31),
    )

    assert result.total == 1
    assert result.items[0].transaction.shop_name == "May Cafe"


def test_transaction_repository_keyword_matches_category_name_and_uncategorized(db_session: Session) -> None:
    add_user(db_session)
    transaction_repository = TransactionRepository(db_session)
    transaction_query_repository = TransactionQueryRepository(db_session)
    category_repository = CategoryRepository(db_session)
    daily = category_repository.create_category(Category(id=uuid4(), user_id=USER_ID, name="日用品", color="#8B5CF6"))
    inactive = category_repository.create_category(Category(id=uuid4(), user_id=USER_ID, name="食費", color="#EF4444"))
    category_repository.create_category(Category(id=uuid4(), user_id=USER_ID, name="未分類", color="#6B7280"))
    transaction_repository.create_transaction(
        Transaction(
            id=uuid4(),
            user_id=USER_ID,
            category_id=daily.id,
            transaction_date=date(2026, 4, 10),
            shop_name="Amazon.co.jp",
            amount=MoneyJPY(4600),
            transaction_type=TransactionType.EXPENSE,
        )
    )
    transaction_repository.create_transaction(
        Transaction(
            id=uuid4(),
            user_id=USER_ID,
            category_id=inactive.id,
            transaction_date=date(2026, 5, 1),
            shop_name="名称未確定の取引",
            amount=MoneyJPY(1200),
            transaction_type=TransactionType.EXPENSE,
        )
    )
    category_repository.set_category_active(user_id=USER_ID, category_id=inactive.id, is_active=False)

    category_result = transaction_query_repository.list_transactions(user_id=USER_ID, page=Page(page=1, page_size=10), keyword="日用品")
    uncategorized_result = transaction_query_repository.list_transactions(user_id=USER_ID, page=Page(page=1, page_size=10), keyword="未分類")

    assert category_result.total == 1
    assert category_result.items[0].transaction.shop_name == "Amazon.co.jp"
    assert uncategorized_result.total == 1
    assert uncategorized_result.items[0].transaction.shop_name == "名称未確定の取引"
    assert uncategorized_result.items[0].category_name == "未分類"
    assert uncategorized_result.items[0].category_color == "#6B7280"


def test_transaction_repository_updates_category_for_same_shop(db_session: Session) -> None:
    add_user(db_session)
    transaction_repository = TransactionRepository(db_session)
    category_repository = CategoryRepository(db_session)
    food = category_repository.create_category(Category(id=uuid4(), user_id=USER_ID, name="食費", color="#EF4444"))
    daily = category_repository.create_category(Category(id=uuid4(), user_id=USER_ID, name="日用品", color="#8B5CF6"))
    target = transaction_repository.create_transaction(
        Transaction(
            id=uuid4(),
            user_id=USER_ID,
            category_id=food.id,
            transaction_date=date(2026, 5, 1),
            shop_name="Cafe",
            amount=MoneyJPY(1200),
            transaction_type=TransactionType.EXPENSE,
        )
    )
    same_shop = transaction_repository.create_transaction(
        Transaction(
            id=uuid4(),
            user_id=USER_ID,
            category_id=food.id,
            transaction_date=date(2026, 5, 2),
            shop_name="Cafe",
            amount=MoneyJPY(800),
            transaction_type=TransactionType.EXPENSE,
        )
    )
    other_shop = transaction_repository.create_transaction(
        Transaction(
            id=uuid4(),
            user_id=USER_ID,
            category_id=food.id,
            transaction_date=date(2026, 5, 3),
            shop_name="Market",
            amount=MoneyJPY(500),
            transaction_type=TransactionType.EXPENSE,
        )
    )

    candidate_count = transaction_repository.count_other_transactions_by_shop(
        user_id=USER_ID,
        transaction_id=target.id,
        shop_name=target.shop_name,
    )
    updated_count = transaction_repository.update_category_for_shop(
        user_id=USER_ID,
        shop_name=target.shop_name,
        category_id=daily.id,
        excluding_transaction_id=target.id,
    )

    assert candidate_count == 1
    assert updated_count == 1
    assert transaction_repository.get_transaction(user_id=USER_ID, transaction_id=target.id).category_id == food.id
    assert transaction_repository.get_transaction(user_id=USER_ID, transaction_id=same_shop.id).category_id == daily.id
    assert transaction_repository.get_transaction(user_id=USER_ID, transaction_id=other_shop.id).category_id == food.id


def test_uncategorized_filter_includes_transactions_with_inactive_categories(db_session: Session) -> None:
    add_user(db_session)
    transaction_repository = TransactionRepository(db_session)
    transaction_query_repository = TransactionQueryRepository(db_session)
    category_repository = CategoryRepository(db_session)
    uncategorized = category_repository.create_category(Category(id=uuid4(), user_id=USER_ID, name="未分類", color="#6B7280"))
    category = category_repository.create_category(Category(id=uuid4(), user_id=USER_ID, name="食費", color="#EF4444"))
    transaction_repository.create_transaction(
        Transaction(
            id=uuid4(),
            user_id=USER_ID,
            category_id=category.id,
            transaction_date=date(2026, 5, 1),
            shop_name="Inactive Category Store",
            amount=MoneyJPY(1200),
            transaction_type=TransactionType.EXPENSE,
        )
    )

    category_repository.set_category_active(user_id=USER_ID, category_id=category.id, is_active=False)

    result = transaction_query_repository.list_transactions(
        user_id=USER_ID,
        page=Page(page=1, page_size=10),
        category_id=uncategorized.id,
    )

    assert result.total == 1
    assert result.items[0].transaction.shop_name == "Inactive Category Store"
    assert result.items[0].category_name == "未分類"


def test_category_repository_can_disable_and_enable_category(db_session: Session) -> None:
    add_user(db_session)
    repository = CategoryRepository(db_session)
    category = repository.create_category(Category(id=uuid4(), user_id=USER_ID, name="食費", color="#EF4444", monthly_budget=MoneyJPY(30000)))

    disabled = repository.set_category_active(user_id=USER_ID, category_id=category.id, is_active=False)
    inactive_categories = repository.list_categories(user_id=USER_ID, include_inactive=True)
    active_categories = repository.list_categories(user_id=USER_ID)
    enabled = repository.set_category_active(user_id=USER_ID, category_id=category.id, is_active=True)

    assert disabled.is_active is False
    assert disabled.monthly_budget is not None
    assert disabled.monthly_budget.amount == 30000
    assert [category.name for category in inactive_categories] == ["食費"]
    assert active_categories == []
    assert enabled.is_active is True


def test_auth_repository_returns_token_expiration_as_utc_aware_datetime(db_session: Session) -> None:
    add_user(db_session)
    refresh_expires_at = datetime(2026, 5, 6, 9, 0)
    reset_expires_at = datetime(2026, 5, 1, 9, 30)
    db_session.add(
        RefreshTokenModel(
            id="refresh-token-id",
            user_id=str(USER_ID),
            token_hash=hash_token("refresh-token"),
            expires_at=refresh_expires_at,
        )
    )
    db_session.add(
        PasswordResetTokenModel(
            id="password-reset-token-id",
            user_id=str(USER_ID),
            token_hash=hash_token("password-reset-token"),
            expires_at=reset_expires_at,
        )
    )
    db_session.commit()

    repository = AuthRepository(db_session)
    refresh_token = repository.get_active_refresh_token(hash_token("refresh-token"))
    reset_token = repository.get_active_password_reset_token(hash_token("password-reset-token"))

    assert refresh_token is not None
    assert refresh_token.expires_at.tzinfo is UTC
    assert reset_token is not None
    assert reset_token.expires_at.tzinfo is UTC


def test_settings_use_case_deletes_user_data_and_pdf_original(db_session: Session) -> None:
    hasher = PasswordHasher()
    password_hash = hasher.hash_password("StrongPass123!")
    add_user(db_session, password_hash=password_hash)
    stored_file_path = f"storage/uploads/{USER_ID}/upload/original.pdf"
    db_session.add(
        UploadModel(
            id=str(uuid4()),
            user_id=str(USER_ID),
            file_name="statement.pdf",
            stored_file_path=stored_file_path,
            status=UploadStatus.COMPLETED.value,
            imported_count=0,
            uploaded_at=datetime.now(UTC),
        )
    )
    db_session.commit()
    storage = FakeStorage()

    use_cases = SettingsUseCases(
        repository=SettingsRepository(db_session),
        storage=storage,  # type: ignore[arg-type]
        password_hasher=hasher,
    )
    use_cases.delete_all_user_data(
        current_user=UserRecord(
            id=USER_ID,
            email="user@example.com",
            password_hash=password_hash,
            is_admin=False,
        ),
        confirmation_text=None,
        password="StrongPass123!",
    )

    assert storage.deleted_paths == [stored_file_path]
    assert db_session.get(UserModel, str(USER_ID)).deleted_at is None
