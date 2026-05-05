from __future__ import annotations

from collections.abc import Iterator
from dataclasses import dataclass
import os
from pathlib import Path
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, delete, text
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, sessionmaker

from app.application.auth.password_hasher import PasswordHasher
from app.infrastructure.config import get_settings
import app.infrastructure.db.session as db_session
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
    monkeypatch.setenv("DATABASE_URL", _get_integration_database_url())
    get_settings.cache_clear()
    try:
        yield
    finally:
        get_settings.cache_clear()


@pytest.fixture(autouse=True)
def integration_upload_storage(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    monkeypatch.setenv("UPLOAD_STORAGE_ROOT", str(tmp_path / "uploads"))
    get_settings.cache_clear()
    try:
        yield
    finally:
        get_settings.cache_clear()


@pytest.fixture(scope="session", autouse=True)
def mysql_schema() -> Iterator[None]:
    original_engine = db_session.engine
    original_session_local = db_session.SessionLocal
    try:
        integration_engine = _prepare_integration_engine()
        integration_session_local = sessionmaker(
            bind=integration_engine,
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
            class_=Session,
        )
        db_session.engine = integration_engine
        db_session.SessionLocal = integration_session_local
        Base.metadata.drop_all(integration_engine)
        Base.metadata.create_all(integration_engine)
    except OperationalError as exc:
        pytest.skip(f"MySQL integration database is not available: {exc}")
    try:
        yield
    finally:
        Base.metadata.drop_all(db_session.engine)
        db_session.engine.dispose()
        db_session.engine = original_engine
        db_session.SessionLocal = original_session_local


@dataclass(frozen=True)
class IntegrationUser:
    user_id: UUID
    email: str
    password: str


@dataclass
class AuthenticatedApiClient:
    client: TestClient
    csrf_token: str

    def get(self, url: str, **kwargs):
        return self.client.get(url, **kwargs)

    def post(self, url: str, **kwargs):
        return self.client.post(url, headers=self._merge_headers(kwargs.pop("headers", None)), **kwargs)

    def put(self, url: str, **kwargs):
        return self.client.put(url, headers=self._merge_headers(kwargs.pop("headers", None)), **kwargs)

    def patch(self, url: str, **kwargs):
        return self.client.patch(url, headers=self._merge_headers(kwargs.pop("headers", None)), **kwargs)

    def delete(self, url: str, **kwargs):
        return self.client.delete(url, headers=self._merge_headers(kwargs.pop("headers", None)), **kwargs)

    def _merge_headers(self, headers: dict[str, str] | None) -> dict[str, str]:
        merged = {"X-CSRF-Token": self.csrf_token}
        if headers:
            merged.update(headers)
        return merged


@pytest.fixture
def integration_user() -> Iterator[IntegrationUser]:
    user = IntegrationUser(
        user_id=uuid4(),
        email=f"it-{uuid4().hex}@example.com",
        password="SamplePassw0rd!",
    )
    with db_session.SessionLocal() as session:
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
        with db_session.SessionLocal() as session:
            _cleanup_user(session, user.user_id)
            session.commit()


@pytest.fixture
def client() -> TestClient:
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


@pytest.fixture
def authenticated_client(client: TestClient, integration_user: IntegrationUser) -> TestClient:
    response = client.post(
        "/api/auth/login",
        headers={"X-CSRF-Token": fetch_csrf_token(client)},
        json={"email": integration_user.email, "password": integration_user.password},
    )
    assert response.status_code == 200
    return client


@pytest.fixture
def authenticated_api_client(authenticated_client: TestClient) -> AuthenticatedApiClient:
    return AuthenticatedApiClient(client=authenticated_client, csrf_token=fetch_csrf_token(authenticated_client))


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


def _prepare_integration_engine() -> Engine:
    integration_database_url = _get_integration_database_url()
    admin_database_url = os.getenv(
        "INTEGRATION_ADMIN_DATABASE_URL",
        "mysql+pymysql://root:root_password@mysql:3306/mysql",
    )
    database_name = _extract_database_name(integration_database_url)
    database_user = _extract_database_user(integration_database_url)

    admin_engine = create_engine(admin_database_url, future=True)
    with admin_engine.connect().execution_options(isolation_level="AUTOCOMMIT") as connection:
        connection.execute(text(f"CREATE DATABASE IF NOT EXISTS `{database_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"))
        connection.execute(text(f"GRANT ALL PRIVILEGES ON `{database_name}`.* TO '{database_user}'@'%'"))
        connection.execute(text("FLUSH PRIVILEGES"))
    admin_engine.dispose()

    return create_engine(
        integration_database_url,
        pool_pre_ping=True,
        future=True,
    )


def _get_integration_database_url() -> str:
    return os.getenv(
        "INTEGRATION_DATABASE_URL",
        "mysql+pymysql://kakeibo:kakeibo_password@mysql:3306/kakeibo_integration",
    )


def _extract_database_name(database_url: str) -> str:
    database_name = make_url(database_url).database
    if not database_name or not database_name.replace("_", "").isalnum():
        raise RuntimeError("INTEGRATION_DATABASE_URL の database 名が不正です。")
    return database_name


def _extract_database_user(database_url: str) -> str:
    username = make_url(database_url).username
    if not username or not username.replace("_", "").isalnum():
        raise RuntimeError("INTEGRATION_DATABASE_URL の user 名が不正です。")
    return username
