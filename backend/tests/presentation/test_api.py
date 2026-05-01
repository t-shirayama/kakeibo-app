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
from app.infrastructure.models.user import UserModel
from app.main import app
from app.presentation.api.dependencies import get_current_user


USER_ID = UUID("11111111-1111-1111-1111-111111111111")


def test_health_and_csrf_endpoints() -> None:
    client = TestClient(app)

    assert client.get("/api/health").json() == {"status": "ok"}
    assert client.get("/api/auth/csrf").json()["csrf_token"]


def test_settings_endpoint_with_overridden_user() -> None:
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
