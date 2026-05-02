from datetime import datetime
from hashlib import sha256
import re

import fitz

from app.application.importing.pdf_importer import ImportedCardTransaction
from app.domain.value_objects import MoneyJPY


class RakutenCardPdfParser:
    """楽天カード明細PDFのテキストを、固定的な表記ルールに沿って抽出する。"""

    source_format = "rakuten_card_pdf"
    _fallback_pattern = re.compile(
        r"(?P<date>\d{4}/\d{1,2}/\d{1,2})\s+"
        r"(?P<shop_name>.+?)\s+"
        r"(?P<card_user_name>\S+)\s+"
        r"(?P<payment_method>\S+)\s+"
        r"(?P<amount>-?[\d,]+)円?"
    )

    def parse(self, pdf_bytes: bytes) -> list[ImportedCardTransaction]:
        return self.parse_text(self._extract_text(pdf_bytes))

    def parse_text(self, text: str) -> list[ImportedCardTransaction]:
        transactions: list[ImportedCardTransaction] = []

        # fixtureではページ境界を明示し、実PDF抽出時と同じページ番号を検証できるようにする。
        current_page = 1
        row_number = 0
        for raw_line in text.splitlines():
            line = raw_line.strip()
            if not line:
                continue
            page_match = re.match(r"^--- page (?P<page>\d+) ---$", line)
            if page_match:
                current_page = int(page_match.group("page"))
                row_number = 0
                continue
            parsed = self._parse_line(line)
            if parsed is None:
                continue
            row_number += 1
            transaction_date, shop_name, card_user_name, payment_method, amount = parsed
            # 重複判定に使うため、表示値だけでなくページ番号・行番号もハッシュへ含める。
            source_hash = self._source_hash(
                transaction_date=transaction_date.isoformat(),
                shop_name=shop_name,
                card_user_name=card_user_name,
                payment_method=payment_method,
                amount=str(amount),
                source_page_number=str(current_page),
                source_row_number=str(row_number),
            )
            transactions.append(
                ImportedCardTransaction(
                    transaction_date=transaction_date,
                    shop_name=shop_name,
                    card_user_name=card_user_name,
                    payment_method=payment_method,
                    amount=MoneyJPY(amount),
                    source_row_number=row_number,
                    source_page_number=current_page,
                    source_format=self.source_format,
                    source_hash=source_hash,
                )
            )

        return transactions

    def _parse_line(self, line: str) -> tuple[object, str, str | None, str | None, int] | None:
        # まずPDF抽出後の列区切りを優先し、崩れた行だけ正規表現のフォールバックで拾う。
        parts = [part.strip() for part in re.split(r"\s{2,}|\t+", line) if part.strip()]
        if len(parts) >= 5 and re.fullmatch(r"\d{4}/\d{1,2}/\d{1,2}", parts[0]):
            amount_text = parts[-1]
            payment_method = parts[-2]
            card_user_name = parts[-3]
            shop_name = " ".join(parts[1:-3]).strip()
            amount = self._parse_amount(amount_text)
            if shop_name and amount is not None:
                return datetime.strptime(parts[0], "%Y/%m/%d").date(), shop_name, card_user_name, payment_method, amount

        match = self._fallback_pattern.search(line)
        if match is None:
            return None
        amount = self._parse_amount(match.group("amount"))
        if amount is None:
            return None
        return (
            datetime.strptime(match.group("date"), "%Y/%m/%d").date(),
            match.group("shop_name").strip(),
            match.group("card_user_name").strip(),
            match.group("payment_method").strip(),
            amount,
        )

    def _parse_amount(self, amount_text: str) -> int | None:
        normalized = amount_text.replace(",", "").replace("円", "").strip()
        if not re.fullmatch(r"-?\d+", normalized):
            return None
        return int(normalized)

    def _source_hash(self, **values: str) -> str:
        payload = "|".join(values[key] for key in sorted(values))
        return sha256(payload.encode("utf-8")).hexdigest()

    def _extract_text(self, pdf_bytes: bytes) -> str:
        with fitz.open(stream=pdf_bytes, filetype="pdf") as document:
            return "\n".join(f"--- page {index + 1} ---\n{page.get_text()}" for index, page in enumerate(document))
