"""sample data for local verification

Revision ID: 20260501_0002
Revises: 20260501_0001
Create Date: 2026-05-01
"""

from collections.abc import Sequence
from datetime import UTC, date, datetime
import json

import sqlalchemy as sa
from alembic import op

revision: str = "20260501_0002"
down_revision: str | None = "20260501_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


SAMPLE_USER_ID = "00000000-0000-0000-0000-000000000101"
SAMPLE_EMAIL = "sample@example.com"
SAMPLE_PASSWORD_HASH = "pbkdf2_sha256$390000$a2FrZWliby1zYW1wbGUtMDE$-z5RQelXKw6dq0i6W8h74jvLXibwI7dd2wTpqFipSv0"

CATEGORY_FOOD_ID = "00000000-0000-0000-0000-000000000201"
CATEGORY_DAILY_ID = "00000000-0000-0000-0000-000000000202"
CATEGORY_TRANSPORT_ID = "00000000-0000-0000-0000-000000000203"
CATEGORY_UTILITIES_ID = "00000000-0000-0000-0000-000000000204"
CATEGORY_ENTERTAINMENT_ID = "00000000-0000-0000-0000-000000000205"
CATEGORY_SALARY_ID = "00000000-0000-0000-0000-000000000206"
CATEGORY_HEALTH_ID = "00000000-0000-0000-0000-000000000207"
CATEGORY_UNCATEGORIZED_ID = "00000000-0000-0000-0000-000000000208"

UPLOAD_APRIL_ID = "00000000-0000-0000-0000-000000000301"
UPLOAD_MARCH_ID = "00000000-0000-0000-0000-000000000302"
UPLOAD_FAILED_ID = "00000000-0000-0000-0000-000000000303"


def upgrade() -> None:
    now = datetime(2026, 5, 1, 9, 0, tzinfo=UTC)

    users = sa.table(
        "users",
        sa.column("id", sa.CHAR(36)),
        sa.column("email", sa.String(255)),
        sa.column("password_hash", sa.String(255)),
        sa.column("is_admin", sa.Boolean()),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
        sa.column("deleted_at", sa.DateTime(timezone=True)),
    )
    op.bulk_insert(
        users,
        [
            {
                "id": SAMPLE_USER_ID,
                "email": SAMPLE_EMAIL,
                "password_hash": SAMPLE_PASSWORD_HASH,
                "is_admin": True,
                "created_at": now,
                "updated_at": now,
                "deleted_at": None,
            }
        ],
    )

    categories = sa.table(
        "categories",
        sa.column("id", sa.CHAR(36)),
        sa.column("user_id", sa.CHAR(36)),
        sa.column("name", sa.String(100)),
        sa.column("color", sa.String(20)),
        sa.column("description", sa.String(255)),
        sa.column("is_active", sa.Boolean()),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
        sa.column("deleted_at", sa.DateTime(timezone=True)),
    )
    op.bulk_insert(
        categories,
        [
            _category(CATEGORY_FOOD_ID, "食費", "#ff6b7a", "スーパー、コンビニ、カフェ、外食", now),
            _category(CATEGORY_DAILY_ID, "日用品", "#eea932", "Amazon、ドラッグストア、生活用品", now),
            _category(CATEGORY_TRANSPORT_ID, "交通費", "#38a7e0", "電車、バス、Suica、タクシー", now),
            _category(CATEGORY_UTILITIES_ID, "水道光熱費", "#2f7df6", "電気、ガス、水道、通信", now),
            _category(CATEGORY_ENTERTAINMENT_ID, "娯楽", "#9c72de", "映画、配信、書籍、イベント", now),
            _category(CATEGORY_SALARY_ID, "給与", "#16a34a", "給与、賞与、臨時収入", now),
            _category(CATEGORY_HEALTH_ID, "医療・健康", "#14b8a6", "薬局、病院、ジム", now),
            _category(CATEGORY_UNCATEGORIZED_ID, "未分類", "#6B7280", "取込直後や分類未確定の明細", now),
        ],
    )

    uploads = sa.table(
        "uploads",
        sa.column("id", sa.CHAR(36)),
        sa.column("user_id", sa.CHAR(36)),
        sa.column("file_name", sa.String(255)),
        sa.column("stored_file_path", sa.String(500)),
        sa.column("status", sa.String(20)),
        sa.column("imported_count", sa.Integer()),
        sa.column("error_message", sa.String(1000)),
        sa.column("uploaded_at", sa.DateTime(timezone=True)),
        sa.column("deleted_at", sa.DateTime(timezone=True)),
    )
    op.bulk_insert(
        uploads,
        [
            {
                "id": UPLOAD_APRIL_ID,
                "user_id": SAMPLE_USER_ID,
                "file_name": "2026_04_楽天カード.pdf",
                "stored_file_path": f"storage/uploads/{SAMPLE_USER_ID}/{UPLOAD_APRIL_ID}/original.pdf",
                "status": "completed",
                "imported_count": 8,
                "error_message": None,
                "uploaded_at": datetime(2026, 4, 30, 22, 10, tzinfo=UTC),
                "deleted_at": None,
            },
            {
                "id": UPLOAD_MARCH_ID,
                "user_id": SAMPLE_USER_ID,
                "file_name": "2026_03_楽天カード.pdf",
                "stored_file_path": f"storage/uploads/{SAMPLE_USER_ID}/{UPLOAD_MARCH_ID}/original.pdf",
                "status": "completed",
                "imported_count": 4,
                "error_message": None,
                "uploaded_at": datetime(2026, 3, 31, 21, 35, tzinfo=UTC),
                "deleted_at": None,
            },
            {
                "id": UPLOAD_FAILED_ID,
                "user_id": SAMPLE_USER_ID,
                "file_name": "2026_05_読み取り不可.pdf",
                "stored_file_path": f"storage/uploads/{SAMPLE_USER_ID}/{UPLOAD_FAILED_ID}/original.pdf",
                "status": "failed",
                "imported_count": 0,
                "error_message": "明細行を抽出できませんでした。",
                "uploaded_at": datetime(2026, 5, 1, 8, 40, tzinfo=UTC),
                "deleted_at": None,
            },
        ],
    )

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
        [
            _transaction("00000000-0000-0000-0000-000000000401", CATEGORY_SALARY_ID, date(2026, 5, 1), "株式会社サンプル 給与", 280000, "income", "銀行振込", "5月給与", None, None, now),
            _transaction("00000000-0000-0000-0000-000000000402", CATEGORY_FOOD_ID, date(2026, 5, 1), "成城石井", 4280, "expense", "楽天カード", "夕食の食材", UPLOAD_APRIL_ID, "2026_04_楽天カード.pdf", now, 1),
            _transaction("00000000-0000-0000-0000-000000000403", CATEGORY_TRANSPORT_ID, date(2026, 5, 1), "JR東日本", 650, "expense", "Suica", "外出", None, None, now),
            _transaction("00000000-0000-0000-0000-000000000421", CATEGORY_FOOD_ID, date(2026, 5, 18), "まいばすけっと", 1280, "expense", "楽天カード", "朝食の買い足し", None, None, now),
            _transaction("00000000-0000-0000-0000-000000000422", CATEGORY_FOOD_ID, date(2026, 5, 18), "スターバックス", 640, "expense", "楽天カード", "午前のコーヒー", None, None, now),
            _transaction("00000000-0000-0000-0000-000000000423", CATEGORY_DAILY_ID, date(2026, 5, 18), "マツモトキヨシ", 1980, "expense", "楽天カード", "日用品補充", None, None, now),
            _transaction("00000000-0000-0000-0000-000000000424", CATEGORY_TRANSPORT_ID, date(2026, 5, 18), "東京メトロ", 420, "expense", "PASMO", "通勤", None, None, now),
            _transaction("00000000-0000-0000-0000-000000000425", CATEGORY_FOOD_ID, date(2026, 5, 18), "社食", 780, "expense", "現金", "昼食", None, None, now),
            _transaction("00000000-0000-0000-0000-000000000426", CATEGORY_ENTERTAINMENT_ID, date(2026, 5, 18), "Kindle", 1200, "expense", "楽天カード", "電子書籍", None, None, now),
            _transaction("00000000-0000-0000-0000-000000000427", CATEGORY_TRANSPORT_ID, date(2026, 5, 18), "都営バス", 210, "expense", "ICカード", "移動", None, None, now),
            _transaction("00000000-0000-0000-0000-000000000428", CATEGORY_FOOD_ID, date(2026, 5, 18), "オーケー", 3680, "expense", "楽天カード", "夕食の食材", None, None, now),
            _transaction("00000000-0000-0000-0000-000000000429", CATEGORY_HEALTH_ID, date(2026, 5, 18), "クリニック", 2500, "expense", "現金", "定期受診", None, None, now),
            _transaction("00000000-0000-0000-0000-000000000430", CATEGORY_FOOD_ID, date(2026, 5, 18), "コンビニ", 430, "expense", "現金", "夜食", None, None, now),
            _transaction("00000000-0000-0000-0000-000000000404", CATEGORY_FOOD_ID, date(2026, 4, 30), "セブン-イレブン", 980, "expense", "楽天カード", "朝食", UPLOAD_APRIL_ID, "2026_04_楽天カード.pdf", now, 2),
            _transaction("00000000-0000-0000-0000-000000000405", CATEGORY_DAILY_ID, date(2026, 4, 28), "Amazon.co.jp", 5980, "expense", "楽天カード", "洗剤と日用品", UPLOAD_APRIL_ID, "2026_04_楽天カード.pdf", now, 3),
            _transaction("00000000-0000-0000-0000-000000000406", CATEGORY_UTILITIES_ID, date(2026, 4, 25), "東京電力", 12640, "expense", "口座振替", "電気代", None, None, now),
            _transaction("00000000-0000-0000-0000-000000000407", CATEGORY_ENTERTAINMENT_ID, date(2026, 4, 20), "Netflix", 1490, "expense", "楽天カード", "動画配信", UPLOAD_APRIL_ID, "2026_04_楽天カード.pdf", now, 4),
            _transaction("00000000-0000-0000-0000-000000000408", CATEGORY_HEALTH_ID, date(2026, 4, 18), "マツモトキヨシ", 2380, "expense", "楽天カード", "常備薬", UPLOAD_APRIL_ID, "2026_04_楽天カード.pdf", now, 5),
            _transaction("00000000-0000-0000-0000-000000000409", CATEGORY_SALARY_ID, date(2026, 4, 15), "株式会社サンプル 給与", 280000, "income", "銀行振込", "4月給与", None, None, now),
            _transaction("00000000-0000-0000-0000-000000000410", CATEGORY_FOOD_ID, date(2026, 4, 10), "近所のレストラン", 7800, "expense", "楽天カード", "外食", UPLOAD_APRIL_ID, "2026_04_楽天カード.pdf", now, 6),
            _transaction("00000000-0000-0000-0000-000000000411", CATEGORY_TRANSPORT_ID, date(2026, 4, 5), "Suicaチャージ", 5000, "expense", "楽天カード", "交通系IC", UPLOAD_APRIL_ID, "2026_04_楽天カード.pdf", now, 7),
            _transaction("00000000-0000-0000-0000-000000000412", CATEGORY_DAILY_ID, date(2026, 4, 3), "返品調整 Amazon.co.jp", -1200, "expense", "楽天カード", "返品による取消", UPLOAD_APRIL_ID, "2026_04_楽天カード.pdf", now, 8),
            _transaction("00000000-0000-0000-0000-000000000413", CATEGORY_FOOD_ID, date(2026, 3, 28), "ライフ", 6420, "expense", "楽天カード", "食材まとめ買い", UPLOAD_MARCH_ID, "2026_03_楽天カード.pdf", now, 1),
            _transaction("00000000-0000-0000-0000-000000000414", CATEGORY_UTILITIES_ID, date(2026, 3, 24), "東京ガス", 7420, "expense", "口座振替", "ガス代", None, None, now),
            _transaction("00000000-0000-0000-0000-000000000415", CATEGORY_ENTERTAINMENT_ID, date(2026, 3, 12), "TOHOシネマズ", 2200, "expense", "楽天カード", "映画", UPLOAD_MARCH_ID, "2026_03_楽天カード.pdf", now, 2),
            _transaction("00000000-0000-0000-0000-000000000416", CATEGORY_SALARY_ID, date(2026, 3, 15), "株式会社サンプル 給与", 280000, "income", "銀行振込", "3月給与", None, None, now),
            _transaction("00000000-0000-0000-0000-000000000417", CATEGORY_FOOD_ID, date(2026, 1, 20), "スターバックス", 760, "expense", "楽天カード", "カフェ", UPLOAD_MARCH_ID, "2026_03_楽天カード.pdf", now, 3),
            _transaction("00000000-0000-0000-0000-000000000418", CATEGORY_UTILITIES_ID, date(2026, 1, 10), "NTTドコモ", 8360, "expense", "楽天カード", "通信費", UPLOAD_MARCH_ID, "2026_03_楽天カード.pdf", now, 4),
            _transaction("00000000-0000-0000-0000-000000000419", CATEGORY_FOOD_ID, date(2025, 12, 28), "年末スーパー", 12400, "expense", "楽天カード", "年末買い出し", None, None, now),
            _transaction("00000000-0000-0000-0000-000000000420", CATEGORY_UNCATEGORIZED_ID, date(2025, 12, 26), "名称未確定の取引", 3300, "expense", "楽天カード", "分類確認用", None, None, now),
        ],
    )

    user_settings = sa.table(
        "user_settings",
        sa.column("user_id", sa.CHAR(36)),
        sa.column("currency", sa.String(3)),
        sa.column("timezone", sa.String(64)),
        sa.column("date_format", sa.String(20)),
        sa.column("page_size", sa.Integer()),
        sa.column("dark_mode", sa.Boolean()),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    op.bulk_insert(
        user_settings,
        [
            {
                "user_id": SAMPLE_USER_ID,
                "currency": "JPY",
                "timezone": "Asia/Tokyo",
                "date_format": "yyyy/MM/dd",
                "page_size": 10,
                "dark_mode": False,
                "updated_at": now,
            }
        ],
    )

    audit_logs = sa.table(
        "audit_logs",
        sa.column("id", sa.CHAR(36)),
        sa.column("user_id", sa.CHAR(36)),
        sa.column("action", sa.String(100)),
        sa.column("resource_type", sa.String(100)),
        sa.column("resource_id", sa.CHAR(36)),
        sa.column("details", sa.String()),
        sa.column("created_at", sa.DateTime(timezone=True)),
    )
    op.bulk_insert(
        audit_logs,
        [
            {
                "id": "00000000-0000-0000-0000-000000000501",
                "user_id": SAMPLE_USER_ID,
                "action": "sample_data.created",
                "resource_type": "user",
                "resource_id": SAMPLE_USER_ID,
                "details": json.dumps({"email": SAMPLE_EMAIL, "purpose": "local verification"}, ensure_ascii=False),
                "created_at": now,
            },
            {
                "id": "00000000-0000-0000-0000-000000000502",
                "user_id": SAMPLE_USER_ID,
                "action": "upload.failed",
                "resource_type": "upload",
                "resource_id": UPLOAD_FAILED_ID,
                "details": json.dumps({"file_name": "2026_05_読み取り不可.pdf"}, ensure_ascii=False),
                "created_at": datetime(2026, 5, 1, 8, 40, tzinfo=UTC),
            },
        ],
    )


def downgrade() -> None:
    op.execute(sa.text("DELETE FROM audit_logs WHERE user_id = :user_id").bindparams(user_id=SAMPLE_USER_ID))
    op.execute(sa.text("DELETE FROM user_settings WHERE user_id = :user_id").bindparams(user_id=SAMPLE_USER_ID))
    op.execute(sa.text("DELETE FROM transactions WHERE user_id = :user_id").bindparams(user_id=SAMPLE_USER_ID))
    op.execute(sa.text("DELETE FROM uploads WHERE user_id = :user_id").bindparams(user_id=SAMPLE_USER_ID))
    op.execute(sa.text("DELETE FROM categories WHERE user_id = :user_id").bindparams(user_id=SAMPLE_USER_ID))
    op.execute(sa.text("DELETE FROM users WHERE id = :user_id").bindparams(user_id=SAMPLE_USER_ID))


def _category(category_id: str, name: str, color: str, description: str, now: datetime) -> dict[str, object]:
    return {
        "id": category_id,
        "user_id": SAMPLE_USER_ID,
        "name": name,
        "color": color,
        "description": description,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
    }


def _transaction(
    transaction_id: str,
    category_id: str,
    transaction_date: date,
    shop_name: str,
    amount: int,
    transaction_type: str,
    payment_method: str,
    memo: str,
    source_upload_id: str | None,
    source_file_name: str | None,
    now: datetime,
    source_row_number: int | None = None,
) -> dict[str, object]:
    return {
        "id": transaction_id,
        "user_id": SAMPLE_USER_ID,
        "category_id": category_id,
        "transaction_date": transaction_date,
        "shop_name": shop_name,
        "card_user_name": "サンプル太郎" if source_upload_id else None,
        "amount": amount,
        "transaction_type": transaction_type,
        "payment_method": payment_method,
        "memo": memo,
        "source_upload_id": source_upload_id,
        "source_file_name": source_file_name,
        "source_row_number": source_row_number,
        "source_page_number": 1 if source_upload_id else None,
        "source_format": "rakuten_card_pdf" if source_upload_id else None,
        "source_hash": f"sample-{transaction_id[-3:]}",
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
    }
