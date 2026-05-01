from datetime import UTC, date, datetime
from uuid import UUID, uuid4

import pytest

from app.domain.entities import (
    AuditLog,
    Category,
    Transaction,
    TransactionType,
    Upload,
    UploadStatus,
    ensure_unique_category_names,
)
from app.domain.initial_categories import create_initial_categories
from app.domain.value_objects import MoneyJPY


USER_ID = UUID("11111111-1111-1111-1111-111111111111")
CATEGORY_ID = UUID("22222222-2222-2222-2222-222222222222")


def make_transaction(**overrides: object) -> Transaction:
    values = {
        "id": uuid4(),
        "user_id": USER_ID,
        "category_id": CATEGORY_ID,
        "transaction_date": date(2026, 5, 1),
        "shop_name": "Store",
        "amount": MoneyJPY(1200),
        "transaction_type": TransactionType.EXPENSE,
    }
    values.update(overrides)
    return Transaction(**values)  # type: ignore[arg-type]


def test_transaction_requires_shop_name() -> None:
    with pytest.raises(ValueError, match="Shop name"):
        make_transaction(shop_name=" ")


def test_transaction_requires_category() -> None:
    with pytest.raises(ValueError, match="Category"):
        make_transaction(category_id=None)


def test_transaction_requires_supported_type() -> None:
    with pytest.raises(ValueError):
        make_transaction(transaction_type="transfer")


def test_transaction_accepts_income_and_zero_amount() -> None:
    transaction = make_transaction(amount=MoneyJPY(0), transaction_type=TransactionType.INCOME)

    assert transaction.amount.amount == 0
    assert transaction.transaction_type is TransactionType.INCOME


def test_category_requires_name_and_color() -> None:
    with pytest.raises(ValueError, match="Category name"):
        Category(id=uuid4(), user_id=USER_ID, name="", color="#FFFFFF")

    with pytest.raises(ValueError, match="Category color"):
        Category(id=uuid4(), user_id=USER_ID, name="Food", color=" ")


def test_category_names_must_be_unique_per_user_case_insensitive() -> None:
    categories = [
        Category(id=uuid4(), user_id=USER_ID, name="Food", color="#EF4444"),
        Category(id=uuid4(), user_id=USER_ID, name="food", color="#10B981"),
    ]

    with pytest.raises(ValueError, match="unique"):
        ensure_unique_category_names(categories)


def test_upload_requires_valid_status_and_non_negative_imported_count() -> None:
    with pytest.raises(ValueError):
        Upload(
            id=uuid4(),
            user_id=USER_ID,
            file_name="statement.pdf",
            stored_file_path="storage/uploads/user/upload/original.pdf",
            status="waiting",
            uploaded_at=datetime.now(UTC),
        )

    with pytest.raises(ValueError, match="greater than or equal to 0"):
        Upload(
            id=uuid4(),
            user_id=USER_ID,
            file_name="statement.pdf",
            stored_file_path="storage/uploads/user/upload/original.pdf",
            status=UploadStatus.PROCESSING,
            uploaded_at=datetime.now(UTC),
            imported_count=-1,
        )


def test_failed_upload_requires_error_message() -> None:
    with pytest.raises(ValueError, match="error message"):
        Upload(
            id=uuid4(),
            user_id=USER_ID,
            file_name="statement.pdf",
            stored_file_path="storage/uploads/user/upload/original.pdf",
            status=UploadStatus.FAILED,
            uploaded_at=datetime.now(UTC),
        )


def test_audit_log_details_are_immutable_copy() -> None:
    details = {"reason": "manual edit"}
    log = AuditLog(
        id=uuid4(),
        user_id=USER_ID,
        action="transaction.updated",
        resource_type="transaction",
        resource_id=uuid4(),
        details=details,
    )
    details["reason"] = "changed"

    assert log.details["reason"] == "manual edit"
    with pytest.raises(TypeError):
        log.details["reason"] = "other"  # type: ignore[index]


def test_create_initial_categories_returns_unique_active_categories() -> None:
    categories = create_initial_categories(USER_ID)

    ensure_unique_category_names(categories)
    assert categories
    assert all(category.user_id == USER_ID for category in categories)
    assert all(category.is_active for category in categories)
