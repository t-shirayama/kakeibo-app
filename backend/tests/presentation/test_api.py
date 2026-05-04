from __future__ import annotations

from collections.abc import Iterator
from datetime import date
from io import BytesIO
from uuid import UUID
from zipfile import ZipFile

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.application.auth.ports import UserRecord
from app.infrastructure.config import get_settings
from app.infrastructure.db.session import get_db_session
from app.infrastructure.models import Base
from app.infrastructure.models.audit_log import AuditLogModel
from app.infrastructure.models.category import CategoryModel
from app.infrastructure.models.password_reset_token import PasswordResetTokenModel
from app.infrastructure.models.transaction import TransactionModel
from app.infrastructure.models.user import UserModel
from app.main import app
from app.presentation.api.dependencies import get_current_user


USER_ID = UUID("11111111-1111-1111-1111-111111111111")


def test_health_and_csrf_endpoints() -> None:
    client = TestClient(app)

    response = client.get("/api/health")
    assert response.json() == {"status": "ok"}
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["cross-origin-resource-policy"] == "same-origin"
    assert client.get("/api/auth/csrf").json()["csrf_token"]


def test_password_reset_start_hides_token_in_production(monkeypatch) -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, class_=Session)
    with SessionLocal() as session:
        session.add(
            UserModel(
                id=str(USER_ID),
                email="user@example.com",
                password_hash="hash",
                is_admin=False,
            )
        )
        session.commit()

    def override_session() -> Iterator[Session]:
        with SessionLocal() as session:
            yield session

    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("JWT_SECRET_KEY", "test-secret-key-with-32-bytes-minimum!!")
    get_settings.cache_clear()
    app.dependency_overrides[get_db_session] = override_session
    client = TestClient(app)
    csrf_token = client.get("/api/auth/csrf").json()["csrf_token"]
    try:
        existing_response = client.post(
            "/api/auth/password-reset",
            headers={"X-CSRF-Token": csrf_token},
            json={"email": "user@example.com"},
        )
        missing_response = client.post(
            "/api/auth/password-reset",
            headers={"X-CSRF-Token": csrf_token},
            json={"email": "missing@example.com"},
        )
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()

    assert existing_response.status_code == 200
    assert missing_response.status_code == 200
    assert existing_response.json() == {"status": "ok", "reset_token": None}
    assert missing_response.json() == {"status": "ok", "reset_token": None}

    with SessionLocal() as session:
        reset_tokens = session.query(PasswordResetTokenModel).all()
        assert len(reset_tokens) == 1
    Base.metadata.drop_all(engine)


def test_password_reset_start_returns_token_in_test_environment(monkeypatch) -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, class_=Session)
    with SessionLocal() as session:
        session.add(
            UserModel(
                id=str(USER_ID),
                email="user@example.com",
                password_hash="hash",
                is_admin=False,
            )
        )
        session.commit()

    def override_session() -> Iterator[Session]:
        with SessionLocal() as session:
            yield session

    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("JWT_SECRET_KEY", "test-secret-key-with-32-bytes-minimum!!")
    get_settings.cache_clear()
    app.dependency_overrides[get_db_session] = override_session
    client = TestClient(app)
    csrf_token = client.get("/api/auth/csrf").json()["csrf_token"]
    try:
        response = client.post(
            "/api/auth/password-reset",
            headers={"X-CSRF-Token": csrf_token},
            json={"email": "user@example.com"},
        )
    finally:
        app.dependency_overrides.clear()
        get_settings.cache_clear()

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert isinstance(body["reset_token"], str)
    assert body["reset_token"]
    Base.metadata.drop_all(engine)


def test_malformed_upload_multipart_returns_api_error_without_internal_error() -> None:
    client = TestClient(app, raise_server_exceptions=False)
    csrf_token = client.get("/api/auth/csrf").json()["csrf_token"]

    response = client.post(
        "/api/uploads",
        headers={
            "Content-Type": "multipart/form-data; boundary=invalid-boundary",
            "X-CSRF-Token": csrf_token,
        },
        content=b"not-a-valid-multipart-body",
    )

    assert response.status_code == 400
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["cross-origin-resource-policy"] == "same-origin"
    payload = response.json()
    assert payload["error"]["code"] == "http_400"
    assert payload["error"]["message"]
    assert "Internal server error" not in response.text


def test_settings_endpoint_with_overridden_user() -> None:
    # APIテストでは認証依存を差し替え、画面が必要とするレスポンス形だけを確認する。
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, class_=Session)
    with SessionLocal() as session:
        session.add(
            UserModel(
                id=str(USER_ID),
                email="user@example.com",
                password_hash="hash",
                is_admin=False,
            )
        )
        session.commit()

    def override_session() -> Iterator[Session]:
        # FastAPIの依存注入に合わせ、テスト用DBセッションをyieldで渡す。
        with SessionLocal() as session:
            yield session

    def override_user() -> UserRecord:
        return UserRecord(id=USER_ID, email="user@example.com", password_hash="hash", is_admin=False)

    app.dependency_overrides[get_db_session] = override_session
    app.dependency_overrides[get_current_user] = override_user
    try:
        response = TestClient(app).get("/api/settings")
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(engine)

    assert response.status_code == 200
    assert response.json()["currency"] == "JPY"


def test_income_settings_create_override_and_apply_due_transaction() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, class_=Session)
    category_id = "22222222-2222-2222-2222-222222222222"
    with SessionLocal() as session:
        session.add(UserModel(id=str(USER_ID), email="user@example.com", password_hash="hash", is_admin=False))
        session.add(
            CategoryModel(
                id=category_id,
                user_id=str(USER_ID),
                name="給与",
                color="#16a36a",
                description="毎月の収入",
                is_active=True,
            )
        )
        session.commit()

    def override_session() -> Iterator[Session]:
        with SessionLocal() as session:
            yield session

    def override_user() -> UserRecord:
        return UserRecord(id=USER_ID, email="user@example.com", password_hash="hash", is_admin=False)

    app.dependency_overrides[get_db_session] = override_session
    app.dependency_overrides[get_current_user] = override_user
    client = TestClient(app)
    csrf_token = client.get("/api/auth/csrf").json()["csrf_token"]
    try:
        create_response = client.post(
            "/api/income-settings",
            headers={"X-CSRF-Token": csrf_token},
            json={"member_name": "夫", "category_id": category_id, "base_amount": 300000, "base_day": 1},
        )
        assert create_response.status_code == 200
        income_setting_id = create_response.json()["income_setting_id"]

        override_response = client.put(
            f"/api/income-settings/{income_setting_id}/overrides/2026-05",
            headers={"X-CSRF-Token": csrf_token},
            json={"amount": 320000, "day": 1},
        )
        assert override_response.status_code == 200
        assert override_response.json()["overrides"][0]["amount"] == 320000

        list_response = client.get("/api/income-settings")
        assert list_response.status_code == 200
    finally:
        app.dependency_overrides.clear()

    with SessionLocal() as session:
        rows = session.query(TransactionModel).filter(TransactionModel.user_id == str(USER_ID)).all()
        assert len(rows) == 1
        assert rows[0].transaction_type == "income"
        assert rows[0].amount == 320000
        assert rows[0].source_format == "income_setting"
        Base.metadata.drop_all(engine)


def test_transaction_export_endpoint_applies_search_filters() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, class_=Session)
    daily_id = "22222222-2222-2222-2222-222222222222"
    food_id = "33333333-3333-3333-3333-333333333333"
    with SessionLocal() as session:
        session.add(UserModel(id=str(USER_ID), email="user@example.com", password_hash="hash", is_admin=False))
        session.add_all(
            [
                CategoryModel(id=daily_id, user_id=str(USER_ID), name="日用品", color="#8B5CF6", is_active=True),
                CategoryModel(id=food_id, user_id=str(USER_ID), name="食費", color="#EF4444", is_active=True),
                TransactionModel(
                    id="44444444-4444-4444-4444-444444444444",
                    user_id=str(USER_ID),
                    category_id=daily_id,
                    transaction_date=date(2026, 4, 10),
                    shop_name="Amazon.co.jp",
                    amount=4600,
                    transaction_type="expense",
                ),
                TransactionModel(
                    id="55555555-5555-5555-5555-555555555555",
                    user_id=str(USER_ID),
                    category_id=food_id,
                    transaction_date=date(2026, 5, 10),
                    shop_name="成城石井",
                    amount=3200,
                    transaction_type="expense",
                ),
            ]
        )
        session.commit()

    def override_session() -> Iterator[Session]:
        with SessionLocal() as session:
            yield session

    def override_user() -> UserRecord:
        return UserRecord(id=USER_ID, email="user@example.com", password_hash="hash", is_admin=False)

    app.dependency_overrides[get_db_session] = override_session
    app.dependency_overrides[get_current_user] = override_user
    try:
        response = TestClient(app).get(
            "/api/transactions/export",
            params={
                "keyword": "Amazon",
                "category_id": daily_id,
                "date_from": "2026-04-01",
                "date_to": "2026-04-30",
            },
        )
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(engine)

    assert response.status_code == 200
    with ZipFile(BytesIO(response.content)) as archive:
        workbook_text = "\n".join(
            archive.read(name).decode("utf-8")
            for name in archive.namelist()
            if name.endswith(".xml")
        )

    assert "Amazon.co.jp" in workbook_text
    assert "成城石井" not in workbook_text


def test_transaction_list_response_normalizes_inactive_category_for_display() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, class_=Session)
    inactive_id = "66666666-6666-6666-6666-666666666666"
    uncategorized_id = "77777777-7777-7777-7777-777777777777"
    with SessionLocal() as session:
        session.add(UserModel(id=str(USER_ID), email="user@example.com", password_hash="hash", is_admin=False))
        session.add_all(
            [
                CategoryModel(id=inactive_id, user_id=str(USER_ID), name="食費", color="#EF4444", is_active=False),
                CategoryModel(id=uncategorized_id, user_id=str(USER_ID), name="未分類", color="#6B7280", is_active=True),
                TransactionModel(
                    id="88888888-8888-8888-8888-888888888888",
                    user_id=str(USER_ID),
                    category_id=inactive_id,
                    transaction_date=date(2026, 5, 1),
                    shop_name="名称未確定の取引",
                    amount=1200,
                    transaction_type="expense",
                ),
            ]
        )
        session.commit()

    def override_session() -> Iterator[Session]:
        with SessionLocal() as session:
            yield session

    def override_user() -> UserRecord:
        return UserRecord(id=USER_ID, email="user@example.com", password_hash="hash", is_admin=False)

    app.dependency_overrides[get_db_session] = override_session
    app.dependency_overrides[get_current_user] = override_user
    try:
        response = TestClient(app).get("/api/transactions")
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(engine)

    assert response.status_code == 200
    item = response.json()["items"][0]
    assert item["category_id"] == inactive_id
    assert item["display_category_id"] == uncategorized_id
    assert item["category_name"] == "未分類"
    assert item["category_color"] == "#6B7280"


def test_transaction_list_defaults_to_page_size_10() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, class_=Session)
    category_id = "99999999-9999-9999-9999-999999999999"
    with SessionLocal() as session:
        session.add(UserModel(id=str(USER_ID), email="user@example.com", password_hash="hash", is_admin=False))
        session.add(CategoryModel(id=category_id, user_id=str(USER_ID), name="食費", color="#EF4444", is_active=True))
        session.add_all(
            [
                TransactionModel(
                    id=f"00000000-0000-0000-0000-{index:012d}",
                    user_id=str(USER_ID),
                    category_id=category_id,
                    transaction_date=date(2026, 5, min(index, 28)),
                    shop_name=f"テスト店舗{index}",
                    amount=1000 + index,
                    transaction_type="expense",
                )
                for index in range(1, 13)
            ]
        )
        session.commit()

    def override_session() -> Iterator[Session]:
        with SessionLocal() as session:
            yield session

    def override_user() -> UserRecord:
        return UserRecord(id=USER_ID, email="user@example.com", password_hash="hash", is_admin=False)

    app.dependency_overrides[get_db_session] = override_session
    app.dependency_overrides[get_current_user] = override_user
    try:
        response = TestClient(app).get("/api/transactions")
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(engine)

    assert response.status_code == 200
    payload = response.json()
    assert payload["page"] == 1
    assert payload["page_size"] == 10
    assert payload["total"] == 12
    assert len(payload["items"]) == 10


def test_audit_log_endpoint_lists_filtered_rows() -> None:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, class_=Session)
    with SessionLocal() as session:
        session.add(UserModel(id=str(USER_ID), email="user@example.com", password_hash="hash", is_admin=False))
        session.add_all(
            [
                AuditLogModel(
                    id="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                    user_id=str(USER_ID),
                    action="transaction.updated",
                    resource_type="transaction",
                    resource_id="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                    details={"shop_name": "成城石井"},
                ),
                AuditLogModel(
                    id="cccccccc-cccc-cccc-cccc-cccccccccccc",
                    user_id=str(USER_ID),
                    action="upload.failed",
                    resource_type="upload",
                    resource_id="dddddddd-dddd-dddd-dddd-dddddddddddd",
                    details={"file_name": "broken.pdf"},
                ),
            ]
        )
        session.commit()

    def override_session() -> Iterator[Session]:
        with SessionLocal() as session:
            yield session

    def override_user() -> UserRecord:
        return UserRecord(id=USER_ID, email="user@example.com", password_hash="hash", is_admin=False)

    app.dependency_overrides[get_db_session] = override_session
    app.dependency_overrides[get_current_user] = override_user
    try:
        response = TestClient(app).get("/api/audit-logs", params={"action": "upload.failed"})
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(engine)

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 1
    assert payload["page_size"] == 10
    assert payload["items"][0]["action"] == "upload.failed"
    assert payload["items"][0]["resource_type"] == "upload"
    assert payload["items"][0]["details"]["file_name"] == "broken.pdf"
