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


def test_parse_rakuten_card_statement_with_split_date_and_multiline_shop() -> None:
    text = """--- page 1 ---
利用日
利用店名
利用
者
支払方法
利用金額
2025/01/0
9
ビタミンＣ誘導体のトゥヴェ
ール
本人
1回払い
4,660
0
4,660
4,660
0
2025/01/0
4
アテニア公式ショップ楽天市
場店
本人
1回払い
1,980
0
1,980
1,980
0
"""

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
        }
        for item in parsed
    ] == [
        {
            "transaction_date": "2025-01-09",
            "shop_name": "ビタミンＣ誘導体のトゥヴェール",
            "card_user_name": "本人",
            "payment_method": "1回払い",
            "amount": 4660,
            "source_row_number": 1,
            "source_page_number": 1,
        },
        {
            "transaction_date": "2025-01-04",
            "shop_name": "アテニア公式ショップ楽天市場店",
            "card_user_name": "本人",
            "payment_method": "1回払い",
            "amount": 1980,
            "source_row_number": 2,
            "source_page_number": 1,
        },
    ]


def test_parse_rakuten_card_statement_keeps_new_purchase_marker_on_card_user() -> None:
    text = """--- page 1 ---
利用日
利用店名
利用者
支払方法
利用金額
2026/03/31
ﾙﾐﾈｴｽﾄ
本人*
1回払い
594
0
594
594
0
"""

    parsed = RakutenCardPdfParser().parse_text(text)

    assert len(parsed) == 1
    assert parsed[0].transaction_date.isoformat() == "2026-03-31"
    assert parsed[0].shop_name == "ﾙﾐﾈｴｽﾄ"
    assert parsed[0].card_user_name == "本人*"
    assert parsed[0].payment_method == "1回払い"
    assert parsed[0].amount.amount == 594
