from __future__ import annotations

from datetime import UTC, date, datetime
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.application.auth.password_hasher import PasswordHasher
from app.application.auth.ports import UserRecord
from app.application.common import Page
from app.application.settings import SettingsUseCases
from app.domain.entities import Category, Transaction, TransactionType, UploadStatus
from app.domain.value_objects import MoneyJPY
from app.infrastructure.models.upload import UploadModel
from app.infrastructure.models.user import UserModel
from app.infrastructure.repositories.settings import SettingsRepository
from app.infrastructure.repositories.transactions import TransactionCategoryRepository


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
    repository = TransactionCategoryRepository(db_session)
    category = repository.create_category(
        Category(id=uuid4(), user_id=USER_ID, name="食費", color="#EF4444")
    )

    transaction = repository.create_transaction(
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

    result = repository.list_transactions(user_id=USER_ID, page=Page(page=1, page_size=10))
    assert result.total == 1
    assert result.items[0].shop_name == "Cafe"
    assert repository.source_hash_exists(user_id=USER_ID, source_hash="hash-1")

    repository.soft_delete_transaction(user_id=USER_ID, transaction_id=transaction.id)
    assert repository.list_transactions(user_id=USER_ID, page=Page(page=1, page_size=10)).total == 0


def test_transaction_repository_filters_by_transaction_date(db_session: Session) -> None:
    add_user(db_session)
    repository = TransactionCategoryRepository(db_session)
    category = repository.create_category(Category(id=uuid4(), user_id=USER_ID, name="食費", color="#EF4444"))

    for transaction_date, shop_name in [(date(2026, 5, 1), "May Cafe"), (date(2026, 4, 30), "April Market")]:
        repository.create_transaction(
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

    result = repository.list_transactions(
        user_id=USER_ID,
        page=Page(page=1, page_size=10),
        date_from=date(2026, 5, 1),
        date_to=date(2026, 5, 31),
    )

    assert result.total == 1
    assert result.items[0].shop_name == "May Cafe"


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
    assert db_session.get(UserModel, str(USER_ID)).deleted_at is not None
