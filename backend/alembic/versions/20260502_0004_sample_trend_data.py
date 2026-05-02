"""sample data for yearly dashboard trend

Revision ID: 20260502_0004
Revises: 20260502_0003
Create Date: 2026-05-02
"""

from collections.abc import Sequence
from datetime import UTC, date, datetime

import sqlalchemy as sa
from alembic import op

revision: str = "20260502_0004"
down_revision: str | None = "20260502_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


SAMPLE_USER_ID = "00000000-0000-0000-0000-000000000101"
CATEGORY_FOOD_ID = "00000000-0000-0000-0000-000000000201"
CATEGORY_DAILY_ID = "00000000-0000-0000-0000-000000000202"
CATEGORY_TRANSPORT_ID = "00000000-0000-0000-0000-000000000203"
CATEGORY_UTILITIES_ID = "00000000-0000-0000-0000-000000000204"
CATEGORY_SALARY_ID = "00000000-0000-0000-0000-000000000206"


def upgrade() -> None:
    now = datetime(2026, 5, 2, 9, 0, tzinfo=UTC)
    transactions = sa.table(
        "transactions",
        sa.column("id", sa.CHAR(36)),
        sa.column("user_id", sa.CHAR(36)),
        sa.column("category_id", sa.CHAR(36)),
        sa.column("transaction_date", sa.Date()),
        sa.column("shop_name", sa.String(255)),
        sa.column("card_user_name", sa.String(100)),
        sa.column("amount", sa.BigInteger()),
        sa.column("transaction_type", sa.String(20)),
        sa.column("payment_method", sa.String(100)),
        sa.column("memo", sa.String(1000)),
        sa.column("source_upload_id", sa.CHAR(36)),
        sa.column("source_file_name", sa.String(255)),
        sa.column("source_row_number", sa.Integer()),
        sa.column("source_page_number", sa.Integer()),
        sa.column("source_format", sa.String(50)),
        sa.column("source_hash", sa.String(64)),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
        sa.column("deleted_at", sa.DateTime(timezone=True)),
    )
    op.bulk_insert(
        transactions,
        _trend_transactions(now),
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "DELETE FROM transactions "
            "WHERE user_id = :user_id AND source_hash LIKE 'sample-trend-%'"
        ).bindparams(user_id=SAMPLE_USER_ID)
    )


def _trend_transactions(now: datetime) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    monthly_data = [
        (2025, 6, 268000, 42100, 8900, 5200),
        (2025, 7, 268000, 45600, 9100, 4800),
        (2025, 8, 268000, 50200, 8700, 7600),
        (2025, 9, 272000, 43800, 9300, 6100),
        (2025, 10, 272000, 46600, 9700, 6900),
        (2025, 11, 272000, 48900, 9200, 5400),
        (2025, 12, 280000, 51200, 9600, 7200),
        (2026, 1, 280000, 44200, 8800, 6300),
        (2026, 2, 280000, 46800, 9100, 5800),
    ]
    for index, (year, month, income, food, utilities, transport) in enumerate(monthly_data, start=1):
        rows.extend(
            [
                _transaction(
                    index * 10 + 1,
                    CATEGORY_SALARY_ID,
                    date(year, month, 15),
                    "株式会社サンプル 給与",
                    income,
                    "income",
                    "銀行振込",
                    f"{month}月給与",
                    now,
                ),
                _transaction(
                    index * 10 + 2,
                    CATEGORY_FOOD_ID,
                    date(year, month, 10),
                    "月次スーパー",
                    food,
                    "expense",
                    "楽天カード",
                    "月次食費サンプル",
                    now,
                ),
                _transaction(
                    index * 10 + 3,
                    CATEGORY_UTILITIES_ID,
                    date(year, month, 20),
                    "水道光熱費",
                    utilities,
                    "expense",
                    "口座振替",
                    "月次固定費サンプル",
                    now,
                ),
                _transaction(
                    index * 10 + 4,
                    CATEGORY_TRANSPORT_ID,
                    date(year, month, 25),
                    "交通系ICチャージ",
                    transport,
                    "expense",
                    "楽天カード",
                    "月次交通費サンプル",
                    now,
                ),
            ]
        )
    rows.extend(
        [
            _transaction(
                991,
                CATEGORY_DAILY_ID,
                date(2026, 3, 8),
                "ホームセンター",
                8400,
                "expense",
                "楽天カード",
                "3月日用品サンプル",
                now,
            ),
            _transaction(
                992,
                CATEGORY_DAILY_ID,
                date(2026, 5, 8),
                "ドラッグストア",
                4600,
                "expense",
                "楽天カード",
                "5月日用品サンプル",
                now,
            ),
        ]
    )
    return rows


def _transaction(
    sequence: int,
    category_id: str,
    transaction_date: date,
    shop_name: str,
    amount: int,
    transaction_type: str,
    payment_method: str,
    memo: str,
    now: datetime,
) -> dict[str, object]:
    transaction_id = f"00000000-0000-0000-0000-{600 + sequence:012d}"
    return {
        "id": transaction_id,
        "user_id": SAMPLE_USER_ID,
        "category_id": category_id,
        "transaction_date": transaction_date,
        "shop_name": shop_name,
        "card_user_name": None,
        "amount": amount,
        "transaction_type": transaction_type,
        "payment_method": payment_method,
        "memo": memo,
        "source_upload_id": None,
        "source_file_name": None,
        "source_row_number": None,
        "source_page_number": None,
        "source_format": "sample_data",
        "source_hash": f"sample-trend-{sequence:03d}",
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
    }
