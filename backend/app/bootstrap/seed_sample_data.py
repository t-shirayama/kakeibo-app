from __future__ import annotations

import argparse
from datetime import UTC, date, datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.infrastructure.db.session import SessionLocal
from app.infrastructure.models import (
    AuditLogModel,
    CategoryModel,
    IncomeSettingModel,
    IncomeSettingOverrideModel,
    PasswordResetTokenModel,
    RefreshTokenModel,
    TransactionModel,
    UploadModel,
    UserModel,
    UserSettingModel,
)

SAMPLE_USER_ID = "00000000-0000-0000-0000-000000000101"
SAMPLE_EMAIL = "sample@example.com"
SAMPLE_PASSWORD_HASH = "pbkdf2_sha256$390000$a2FrZWliby1zYW1wbGUtMDE$-z5RQelXKw6dq0i6W8h74jvLXibwI7dd2wTpqFipSv0"
SAMPLE_PASSWORD = "SamplePassw0rd!"

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


def seed_sample_data(session: Session, *, reset: bool = False) -> bool:
    if reset:
        delete_sample_data(session)
    elif sample_data_exists(session):
        return False

    now = datetime(2026, 5, 1, 9, 0, tzinfo=UTC)
    session.add(
        UserModel(
            id=SAMPLE_USER_ID,
            email=SAMPLE_EMAIL,
            password_hash=SAMPLE_PASSWORD_HASH,
            is_admin=True,
            created_at=now,
            updated_at=now,
        )
    )
    session.flush()

    session.add_all(_categories(now))
    session.add_all(_uploads())
    session.add(
        UserSettingModel(
            user_id=SAMPLE_USER_ID,
            currency="JPY",
            timezone="Asia/Tokyo",
            date_format="yyyy/MM/dd",
            page_size=10,
            dark_mode=False,
            updated_at=now,
        )
    )
    session.flush()

    session.add_all(_transactions(now))
    session.add_all(_audit_logs(now))
    return True


def sample_data_exists(session: Session) -> bool:
    return session.scalar(select(UserModel.id).where(UserModel.email == SAMPLE_EMAIL).limit(1)) is not None


def delete_sample_data(session: Session) -> None:
    user_ids = _sample_user_ids(session)
    if not user_ids:
        return

    for model in (
        AuditLogModel,
        TransactionModel,
        IncomeSettingOverrideModel,
        IncomeSettingModel,
        RefreshTokenModel,
        PasswordResetTokenModel,
        UserSettingModel,
        UploadModel,
        CategoryModel,
    ):
        session.execute(delete(model).where(model.user_id.in_(user_ids)))
    session.execute(delete(UserModel).where(UserModel.id.in_(user_ids)))


def _sample_user_ids(session: Session) -> list[str]:
    rows = session.scalars(
        select(UserModel.id).where(
            (UserModel.id == SAMPLE_USER_ID) | (UserModel.email == SAMPLE_EMAIL)
        )
    ).all()
    return [str(row) for row in rows]


def _categories(now: datetime) -> list[CategoryModel]:
    return [
        _category(CATEGORY_FOOD_ID, "食費", "#ff6b7a", "スーパー、コンビニ、カフェ、外食", 45000, now),
        _category(CATEGORY_DAILY_ID, "日用品", "#eea932", "Amazon、ドラッグストア、生活用品", 12000, now),
        _category(CATEGORY_TRANSPORT_ID, "交通費", "#38a7e0", "電車、バス、Suica、タクシー", 15000, now),
        _category(CATEGORY_UTILITIES_ID, "水道光熱費", "#2f7df6", "電気、ガス、水道、通信", 18000, now),
        _category(CATEGORY_ENTERTAINMENT_ID, "娯楽", "#9c72de", "映画、配信、書籍、イベント", 10000, now),
        _category(CATEGORY_SALARY_ID, "給与", "#16a34a", "給与、賞与、臨時収入", None, now),
        _category(CATEGORY_HEALTH_ID, "医療・健康", "#14b8a6", "薬局、病院、ジム", 8000, now),
        _category(CATEGORY_UNCATEGORIZED_ID, "未分類", "#6B7280", "取込直後や分類未確定の明細", None, now),
    ]


def _category(
    category_id: str,
    name: str,
    color: str,
    description: str,
    monthly_budget: int | None,
    now: datetime,
) -> CategoryModel:
    return CategoryModel(
        id=category_id,
        user_id=SAMPLE_USER_ID,
        name=name,
        color=color,
        description=description,
        monthly_budget=monthly_budget,
        is_active=True,
        created_at=now,
        updated_at=now,
    )


def _uploads() -> list[UploadModel]:
    return [
        UploadModel(
            id=UPLOAD_APRIL_ID,
            user_id=SAMPLE_USER_ID,
            file_name="2026_04_楽天カード.pdf",
            stored_file_path=f"storage/uploads/{SAMPLE_USER_ID}/{UPLOAD_APRIL_ID}/original.pdf",
            status="completed",
            imported_count=8,
            uploaded_at=datetime(2026, 4, 30, 22, 10, tzinfo=UTC),
        ),
        UploadModel(
            id=UPLOAD_MARCH_ID,
            user_id=SAMPLE_USER_ID,
            file_name="2026_03_楽天カード.pdf",
            stored_file_path=f"storage/uploads/{SAMPLE_USER_ID}/{UPLOAD_MARCH_ID}/original.pdf",
            status="completed",
            imported_count=4,
            uploaded_at=datetime(2026, 3, 31, 21, 35, tzinfo=UTC),
        ),
        UploadModel(
            id=UPLOAD_FAILED_ID,
            user_id=SAMPLE_USER_ID,
            file_name="2026_05_読み取り不可.pdf",
            stored_file_path=f"storage/uploads/{SAMPLE_USER_ID}/{UPLOAD_FAILED_ID}/original.pdf",
            status="failed",
            imported_count=0,
            error_message="明細行を抽出できませんでした。",
            uploaded_at=datetime(2026, 5, 1, 8, 40, tzinfo=UTC),
        ),
    ]


def _transactions(now: datetime) -> list[TransactionModel]:
    return [
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
        *_trend_transactions(datetime(2026, 5, 2, 9, 0, tzinfo=UTC)),
    ]


def _trend_transactions(now: datetime) -> list[TransactionModel]:
    rows: list[TransactionModel] = []
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
                _trend_transaction(index * 10 + 1, CATEGORY_SALARY_ID, date(year, month, 15), "株式会社サンプル 給与", income, "income", "銀行振込", f"{month}月給与", now),
                _trend_transaction(index * 10 + 2, CATEGORY_FOOD_ID, date(year, month, 10), "月次スーパー", food, "expense", "楽天カード", "月次食費サンプル", now),
                _trend_transaction(index * 10 + 3, CATEGORY_UTILITIES_ID, date(year, month, 20), "水道光熱費", utilities, "expense", "口座振替", "月次固定費サンプル", now),
                _trend_transaction(index * 10 + 4, CATEGORY_TRANSPORT_ID, date(year, month, 25), "交通系ICチャージ", transport, "expense", "楽天カード", "月次交通費サンプル", now),
            ]
        )
    rows.extend(
        [
            _trend_transaction(991, CATEGORY_DAILY_ID, date(2026, 3, 8), "ホームセンター", 8400, "expense", "楽天カード", "3月日用品サンプル", now),
            _trend_transaction(992, CATEGORY_DAILY_ID, date(2026, 5, 8), "ドラッグストア", 4600, "expense", "楽天カード", "5月日用品サンプル", now),
        ]
    )
    return rows


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
) -> TransactionModel:
    return TransactionModel(
        id=transaction_id,
        user_id=SAMPLE_USER_ID,
        category_id=category_id,
        transaction_date=transaction_date,
        shop_name=shop_name,
        card_user_name="サンプル太郎" if source_upload_id else None,
        amount=amount,
        transaction_type=transaction_type,
        payment_method=payment_method,
        memo=memo,
        source_upload_id=source_upload_id,
        source_file_name=source_file_name,
        source_row_number=source_row_number,
        source_page_number=1 if source_upload_id else None,
        source_format="rakuten_card_pdf" if source_upload_id else None,
        source_hash=f"sample-{transaction_id[-3:]}",
        created_at=now,
        updated_at=now,
    )


def _trend_transaction(
    sequence: int,
    category_id: str,
    transaction_date: date,
    shop_name: str,
    amount: int,
    transaction_type: str,
    payment_method: str,
    memo: str,
    now: datetime,
) -> TransactionModel:
    transaction_id = f"00000000-0000-0000-0000-{600 + sequence:012d}"
    return TransactionModel(
        id=transaction_id,
        user_id=SAMPLE_USER_ID,
        category_id=category_id,
        transaction_date=transaction_date,
        shop_name=shop_name,
        amount=amount,
        transaction_type=transaction_type,
        payment_method=payment_method,
        memo=memo,
        source_format="sample_data",
        source_hash=f"sample-trend-{sequence:03d}",
        created_at=now,
        updated_at=now,
    )


def _audit_logs(now: datetime) -> list[AuditLogModel]:
    return [
        AuditLogModel(
            id="00000000-0000-0000-0000-000000000501",
            user_id=SAMPLE_USER_ID,
            action="sample_data.created",
            resource_type="user",
            resource_id=SAMPLE_USER_ID,
            details={"email": SAMPLE_EMAIL, "purpose": "local verification"},
            created_at=now,
        ),
        AuditLogModel(
            id="00000000-0000-0000-0000-000000000502",
            user_id=SAMPLE_USER_ID,
            action="upload.failed",
            resource_type="upload",
            resource_id=UPLOAD_FAILED_ID,
            details={"file_name": "2026_05_読み取り不可.pdf"},
            created_at=datetime(2026, 5, 1, 8, 40, tzinfo=UTC),
        ),
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed local verification sample data.")
    parser.add_argument("--reset", action="store_true", help="Delete known sample data before inserting it.")
    args = parser.parse_args()

    with SessionLocal.begin() as session:
        inserted = seed_sample_data(session, reset=args.reset)

    if inserted:
        print(f"Seeded sample data for {SAMPLE_EMAIL} / {SAMPLE_PASSWORD}.")
    else:
        print("Sample data already exists. Use --reset to recreate it.")


if __name__ == "__main__":
    main()
