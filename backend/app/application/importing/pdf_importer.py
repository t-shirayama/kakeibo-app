from dataclasses import dataclass
from datetime import date
from typing import Protocol

from app.domain.value_objects import MoneyJPY


@dataclass(frozen=True, slots=True)
class ImportedCardTransaction:
    transaction_date: date
    shop_name: str
    card_user_name: str | None
    payment_method: str | None
    amount: MoneyJPY
    source_row_number: int
    source_page_number: int
    source_format: str
    source_hash: str


class CardStatementParser(Protocol):
    def parse(self, pdf_bytes: bytes) -> list[ImportedCardTransaction]:
        raise NotImplementedError
