from dataclasses import dataclass
from datetime import date
from typing import Protocol

from app.domain.value_objects import MoneyJPY


@dataclass(frozen=True, slots=True)
class ImportedCardTransaction:
    transaction_date: date
    description: str
    amount: MoneyJPY


class CardStatementParser(Protocol):
    def parse(self, pdf_bytes: bytes) -> list[ImportedCardTransaction]:
        raise NotImplementedError

