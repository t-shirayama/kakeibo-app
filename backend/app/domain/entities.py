from dataclasses import dataclass, field
from datetime import date, datetime
from enum import StrEnum
from types import MappingProxyType
from typing import Any, Mapping
from uuid import UUID

from app.domain.value_objects import MoneyJPY


class TransactionType(StrEnum):
    EXPENSE = "expense"
    INCOME = "income"


class UploadStatus(StrEnum):
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass(frozen=True, slots=True)
class Transaction:
    id: UUID
    user_id: UUID
    category_id: UUID
    transaction_date: date
    shop_name: str
    amount: MoneyJPY
    transaction_type: TransactionType
    payment_method: str | None = None
    card_user_name: str | None = None
    memo: str | None = None
    source_upload_id: UUID | None = None
    source_file_name: str | None = None
    source_row_number: int | None = None
    source_page_number: int | None = None
    source_format: str | None = None
    source_hash: str | None = None

    def __post_init__(self) -> None:
        if self.transaction_date is None:
            raise ValueError("Transaction date is required.")
        if not self.shop_name.strip():
            raise ValueError("Shop name is required.")
        if self.category_id is None:
            raise ValueError("Category is required.")
        if not isinstance(self.transaction_type, TransactionType):
            object.__setattr__(self, "transaction_type", TransactionType(self.transaction_type))
        _validate_optional_positive("source_row_number", self.source_row_number)
        _validate_optional_positive("source_page_number", self.source_page_number)


@dataclass(frozen=True, slots=True)
class Category:
    id: UUID
    user_id: UUID
    name: str
    color: str
    description: str | None = None
    is_active: bool = True

    def __post_init__(self) -> None:
        if not self.name.strip():
            raise ValueError("Category name is required.")
        if not self.color.strip():
            raise ValueError("Category color is required.")

    def deactivate(self) -> "Category":
        return Category(
            id=self.id,
            user_id=self.user_id,
            name=self.name,
            color=self.color,
            description=self.description,
            is_active=False,
        )


@dataclass(frozen=True, slots=True)
class Upload:
    id: UUID
    user_id: UUID
    file_name: str
    stored_file_path: str
    status: UploadStatus
    uploaded_at: datetime
    imported_count: int = 0
    error_message: str | None = None

    def __post_init__(self) -> None:
        if not self.file_name.strip():
            raise ValueError("File name is required.")
        if not self.stored_file_path.strip():
            raise ValueError("Stored file path is required.")
        if not isinstance(self.status, UploadStatus):
            object.__setattr__(self, "status", UploadStatus(self.status))
        if self.imported_count < 0:
            raise ValueError("Imported count must be greater than or equal to 0.")
        if self.status is UploadStatus.FAILED and not self.error_message:
            raise ValueError("Failed uploads require an error message.")


@dataclass(frozen=True, slots=True)
class AuditLog:
    id: UUID
    user_id: UUID
    action: str
    resource_type: str
    resource_id: UUID
    details: Mapping[str, Any] = field(default_factory=dict)
    created_at: datetime | None = None

    def __post_init__(self) -> None:
        if not self.action.strip():
            raise ValueError("Audit action is required.")
        if not self.resource_type.strip():
            raise ValueError("Audit resource type is required.")
        object.__setattr__(self, "details", MappingProxyType(dict(self.details)))


def ensure_unique_category_names(categories: list[Category]) -> None:
    seen: set[tuple[UUID, str]] = set()
    for category in categories:
        key = (category.user_id, category.name.casefold())
        if key in seen:
            raise ValueError("Category names must be unique per user.")
        seen.add(key)


def _validate_optional_positive(name: str, value: int | None) -> None:
    if value is not None and value <= 0:
        raise ValueError(f"{name} must be greater than 0.")
