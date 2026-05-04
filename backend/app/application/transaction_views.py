from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from app.domain.entities import Transaction


@dataclass(frozen=True, slots=True)
class TransactionWithCategory:
    transaction: Transaction
    display_category_id: UUID
    category_name: str
    category_color: str
