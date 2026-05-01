from datetime import datetime
import re

import fitz

from app.application.importing.pdf_importer import ImportedCardTransaction
from app.domain.value_objects import MoneyJPY


class RakutenCardPdfParser:
    """Rule-based parser placeholder for Rakuten Card statements."""

    _line_pattern = re.compile(
        r"(?P<date>\d{4}/\d{1,2}/\d{1,2})\s+"
        r"(?P<description>.+?)\s+"
        r"(?P<amount>-?[\d,]+)円?"
    )

    def parse(self, pdf_bytes: bytes) -> list[ImportedCardTransaction]:
        text = self._extract_text(pdf_bytes)
        transactions: list[ImportedCardTransaction] = []

        for line in text.splitlines():
            match = self._line_pattern.search(line)
            if match is None:
                continue
            amount = int(match.group("amount").replace(",", ""))
            transactions.append(
                ImportedCardTransaction(
                    transaction_date=datetime.strptime(match.group("date"), "%Y/%m/%d").date(),
                    description=match.group("description").strip(),
                    amount=MoneyJPY(amount),
                )
            )

        return transactions

    def _extract_text(self, pdf_bytes: bytes) -> str:
        with fitz.open(stream=pdf_bytes, filetype="pdf") as document:
            return "\n".join(page.get_text() for page in document)

