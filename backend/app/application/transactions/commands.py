from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from uuid import UUID

from app.domain.entities import TransactionType


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
    monthly_budget: int | None = None
