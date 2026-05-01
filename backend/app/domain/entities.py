from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from app.domain.value_objects import MoneyJPY


@dataclass(frozen=True, slots=True)
class Transaction:
    id: UUID
    amount: MoneyJPY
    occurred_at: datetime
    description: str
    category_id: UUID | None = None

