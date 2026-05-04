from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.application.auth.password_hasher import PasswordHasher
from app.infrastructure.config import get_settings
from app.infrastructure.db.session import SessionLocal, engine
from app.infrastructure.models import Base
from app.infrastructure.models.audit_log import AuditLogModel
from app.infrastructure.models.category import CategoryModel
from app.infrastructure.models.income_setting import IncomeSettingModel, IncomeSettingOverrideModel
from app.infrastructure.models.password_reset_token import PasswordResetTokenModel
from app.infrastructure.models.refresh_token import RefreshTokenModel
from app.infrastructure.models.transaction import TransactionModel
from app.infrastructure.models.upload import UploadModel
from app.infrastructure.models.user import UserModel
from app.infrastructure.models.user_setting import UserSettingModel
from app.main import app


@pytest.fixture(autouse=True)
def integration_settings(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("COOKIE_SECURE", "false")
    monkeypatch.setenv("JWT_SECRET_KEY", "integration-test-secret-key-32-bytes!!")
    get_settings.cache_clear()
    try:
        yield
    finally:
        get_settings.cache_clear()


@pytest.fixture(scope="session", autouse=True)
def mysql_schema() -> Iterator[None]:
    try:
        Base.metadata.create_all(engine)
    except OperationalError as exc:
        pytest.skip(f"MySQL integration database is not available: {exc}")
    yield


@dataclass(frozen=True)
class IntegrationUser:
    user_id: UUID
    email: str
    password: str


@pytest.fixture
def integration_user() -> Iterator[IntegrationUser]:
    user = IntegrationUser(
        user_id=uuid4(),
        email=f"it-{uuid4().hex}@example.com",
        password="SamplePassw0rd!",
    )
    with SessionLocal() as session:
        _cleanup_user(session, user.user_id)
        session.add(
            UserModel(
                id=str(user.user_id),
                email=user.email,
                password_hash=PasswordHasher().hash_password(user.password),
                is_admin=False,
            )
        )
        session.commit()

    try:
        yield user
    finally:
        with SessionLocal() as session:
            _cleanup_user(session, user.user_id)
            session.commit()


@pytest.fixture
def client() -> TestClient:
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


@pytest.fixture
def authenticated_client(client: TestClient, integration_user: IntegrationUser) -> TestClient:
    csrf_token = fetch_csrf_token(client)
    response = client.post(
        "/api/auth/login",
        headers={"X-CSRF-Token": csrf_token},
        json={"email": integration_user.email, "password": integration_user.password},
    )
    assert response.status_code == 200
    return client


def fetch_csrf_token(client: TestClient) -> str:
    response = client.get("/api/auth/csrf")
    assert response.status_code == 200
    token = response.json()["csrf_token"]
    assert token
    return token


def _cleanup_user(session: Session, user_id: UUID) -> None:
    user_id_text = str(user_id)
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
        session.execute(delete(model).where(model.user_id == user_id_text))
    session.execute(delete(UserModel).where(UserModel.id == user_id_text))
