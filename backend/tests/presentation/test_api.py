from __future__ import annotations

from collections.abc import Iterator
from uuid import UUID

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.application.auth.ports import UserRecord
from app.infrastructure.db.session import get_db_session
from app.infrastructure.models import Base
from app.infrastructure.models.category import CategoryModel
from app.infrastructure.models.transaction import TransactionModel
from app.infrastructure.models.user import UserModel
from app.main import app
from app.presentation.api.dependencies import get_current_user


USER_ID = UUID("11111111-1111-1111-1111-111111111111")


def test_health_and_csrf_endpoints() -> None:
    client = TestClient(app)

    assert client.get("/api/health").json() == {"status": "ok"}
    assert client.get("/api/auth/csrf").json()["csrf_token"]


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
