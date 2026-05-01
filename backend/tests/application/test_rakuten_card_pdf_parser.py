from __future__ import annotations

import json
from pathlib import Path

from app.infrastructure.parsers.rakuten_card_pdf_parser import RakutenCardPdfParser


FIXTURE_DIR = Path(__file__).resolve().parents[1] / "fixtures"


def test_parse_rakuten_card_statement_text_fixture() -> None:
    text = (FIXTURE_DIR / "rakuten_card_statement_text.txt").read_text(encoding="utf-8")
    expected = json.loads((FIXTURE_DIR / "rakuten_card_statement_expected.json").read_text(encoding="utf-8"))

    parsed = RakutenCardPdfParser().parse_text(text)

    assert [
        {
            "transaction_date": item.transaction_date.isoformat(),
            "shop_name": item.shop_name,
            "card_user_name": item.card_user_name,
            "payment_method": item.payment_method,
            "amount": item.amount.amount,
            "source_row_number": item.source_row_number,
            "source_page_number": item.source_page_number,
            "source_format": item.source_format,
        }
        for item in parsed
    ] == expected
    assert all(item.source_hash for item in parsed)
