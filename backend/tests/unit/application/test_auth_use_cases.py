from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

import pytest

from app.application.auth.ports import AuthSettings, PasswordResetTokenRecord, RefreshTokenRecord, UserRecord
from app.application.auth.use_cases import AuthError, AuthUseCases


USER_ID = UUID("11111111-1111-1111-1111-111111111111")


class FakeAuthRepository:
    def __init__(self) -> None:
        self.users: dict[str, UserRecord] = {}
        self.refresh_tokens: dict[str, RefreshTokenRecord] = {}
        self.reset_tokens: dict[str, PasswordResetTokenRecord] = {}
        self.revoked_refresh_tokens: list[str] = []
        self.updated_passwords: dict[UUID, str] = {}
        self.used_reset_tokens: list[str] = []

    def has_any_user(self) -> bool:
        return bool(self.users)

    def get_active_user_by_email(self, email: str) -> UserRecord | None:
        return self.users.get(email)

    def get_active_user_by_id(self, user_id: UUID) -> UserRecord | None:
        return next((user for user in self.users.values() if user.id == user_id), None)

    def create_user(self, *, email: str, password_hash: str, is_admin: bool) -> UserRecord:
        user = UserRecord(id=USER_ID if not self.users else uuid4(), email=email, password_hash=password_hash, is_admin=is_admin)
        self.users[email] = user
        return user

    def update_user_password(self, *, user_id: UUID, password_hash: str) -> None:
        self.updated_passwords[user_id] = password_hash

    def create_refresh_token(
        self,
        *,
        token_id: str,
        user_id: UUID,
        token_hash: str,
        expires_at: datetime,
        replaced_token_id: str | None = None,
    ) -> None:
        self.refresh_tokens[token_hash] = RefreshTokenRecord(id=token_id, user_id=user_id, expires_at=expires_at)

    def get_active_refresh_token(self, token_hash: str) -> RefreshTokenRecord | None:
        return self.refresh_tokens.get(token_hash)

    def revoke_refresh_token(self, token_id: str, *, revoked_at: datetime) -> None:
        self.revoked_refresh_tokens.append(token_id)

    def create_password_reset_token(self, *, user_id: UUID, token_hash: str, expires_at: datetime) -> None:
        self.reset_tokens[token_hash] = PasswordResetTokenRecord(id="reset-id", user_id=user_id, expires_at=expires_at)

    def get_active_password_reset_token(self, token_hash: str) -> PasswordResetTokenRecord | None:
        return self.reset_tokens.get(token_hash)

    def mark_password_reset_token_used(self, token_id: str, *, used_at: datetime) -> None:
        self.used_reset_tokens.append(token_id)


class FakeJwtService:
    def __init__(self) -> None:
        self.refresh_jti = "refresh-id"
        self.reset_subject = str(USER_ID)
        self.decoded: dict[str, dict[str, Any]] = {}

    def issue_access_token(self, subject: str) -> str:
        token = f"access:{subject}"
        self.decoded[token] = {"typ": "access", "sub": subject}
        return token

    def issue_refresh_token(self, subject: str) -> str:
        token = f"refresh:{self.refresh_jti}:{subject}"
        self.decoded[token] = {"typ": "refresh", "sub": subject, "jti": self.refresh_jti}
        return token

    def issue_reset_token(self, subject: str) -> str:
        token = f"reset:{subject}"
        self.decoded[token] = {"typ": "password_reset", "sub": subject}
        return token

    def decode(self, token: str) -> dict[str, Any]:
        return self.decoded[token]


class FakePasswordHasher:
    def hash_password(self, password: str) -> str:
        return f"hashed:{password}"

    def verify(self, password: str, password_hash: str) -> bool:
        return password_hash == self.hash_password(password)


class FakeTokenHasher:
    def hash_token(self, token: str) -> str:
        return f"token-hash:{token}"


def make_use_cases(repository: FakeAuthRepository | None = None, jwt: FakeJwtService | None = None) -> AuthUseCases:
    return AuthUseCases(
        repository=repository or FakeAuthRepository(),
        settings=AuthSettings(jwt_secret="secret", jwt_algorithm="HS256", access_token_minutes=15, refresh_token_days=7),
        jwt_service=jwt or FakeJwtService(),
        password_hasher=FakePasswordHasher(),
        token_hasher=FakeTokenHasher(),
    )


def test_bootstrap_admin_creates_initial_admin_and_blocks_second_bootstrap() -> None:
    repository = FakeAuthRepository()
    use_cases = make_use_cases(repository)

    admin = use_cases.bootstrap_admin(email="admin@example.com", password="StrongPass123!")

    assert admin.is_admin is True
    with pytest.raises(AuthError, match="Initial admin"):
        use_cases.bootstrap_admin(email="other@example.com", password="StrongPass123!")


def test_admin_can_create_user_but_non_admin_cannot() -> None:
    repository = FakeAuthRepository()
    use_cases = make_use_cases(repository)
    admin = use_cases.bootstrap_admin(email="admin@example.com", password="StrongPass123!")

    user = use_cases.create_user_by_admin(admin_user=admin, email="user@example.com", password="StrongPass123!")

    assert user.is_admin is False
    with pytest.raises(AuthError, match="Admin privileges"):
        use_cases.create_user_by_admin(admin_user=user, email="fail@example.com", password="StrongPass123!")
    with pytest.raises(AuthError, match="already registered"):
        use_cases.create_user_by_admin(admin_user=admin, email="user@example.com", password="StrongPass123!")


def test_login_issues_tokens_and_rejects_invalid_credentials() -> None:
    repository = FakeAuthRepository()
    use_cases = make_use_cases(repository)
    use_cases.bootstrap_admin(email="admin@example.com", password="StrongPass123!")

    user, tokens = use_cases.login(email="admin@example.com", password="StrongPass123!")

    assert user.email == "admin@example.com"
    assert tokens.access_token.startswith("access:")
    assert tokens.access_max_age_seconds == 900
    assert tokens.refresh_max_age_seconds == 7 * 24 * 60 * 60
    with pytest.raises(AuthError, match="Invalid email or password"):
        use_cases.login(email="admin@example.com", password="WrongPass123!")
    with pytest.raises(AuthError, match="Invalid email or password"):
        use_cases.login(email="missing@example.com", password="StrongPass123!")


def test_refresh_rotates_valid_refresh_token_and_rejects_invalid_states() -> None:
    repository = FakeAuthRepository()
    jwt = FakeJwtService()
    use_cases = make_use_cases(repository, jwt)
    user = use_cases.bootstrap_admin(email="admin@example.com", password="StrongPass123!")
    _, tokens = use_cases.login(email=user.email, password="StrongPass123!")

    rotated = use_cases.refresh(refresh_token=tokens.refresh_token)

    assert rotated.refresh_token.startswith("refresh:")
    assert repository.revoked_refresh_tokens == ["refresh-id"]

    jwt.decoded[tokens.refresh_token] = {"typ": "access", "sub": str(user.id), "jti": "refresh-id"}
    with pytest.raises(AuthError, match="Invalid refresh token type"):
        use_cases.refresh(refresh_token=tokens.refresh_token)

    jwt.decoded[tokens.refresh_token] = {"typ": "refresh", "sub": str(user.id), "jti": "missing"}
    with pytest.raises(AuthError, match="payload does not match"):
        use_cases.refresh(refresh_token=tokens.refresh_token)

    repository.refresh_tokens[FakeTokenHasher().hash_token(tokens.refresh_token)] = RefreshTokenRecord(
        id="missing",
        user_id=user.id,
        expires_at=datetime.now(UTC) - timedelta(seconds=1),
    )
    with pytest.raises(AuthError, match="expired"):
        use_cases.refresh(refresh_token=tokens.refresh_token)

    repository.refresh_tokens.clear()
    with pytest.raises(AuthError, match="invalid or revoked"):
        use_cases.refresh(refresh_token=tokens.refresh_token)


def test_logout_revokes_existing_refresh_token_and_ignores_empty_or_unknown_token() -> None:
    repository = FakeAuthRepository()
    use_cases = make_use_cases(repository)
    use_cases.bootstrap_admin(email="admin@example.com", password="StrongPass123!")
    _, tokens = use_cases.login(email="admin@example.com", password="StrongPass123!")

    use_cases.logout(refresh_token=None)
    use_cases.logout(refresh_token="unknown")
    use_cases.logout(refresh_token=tokens.refresh_token)

    assert repository.revoked_refresh_tokens == ["refresh-id"]


def test_password_reset_flow_updates_password_and_marks_token_used() -> None:
    repository = FakeAuthRepository()
    use_cases = make_use_cases(repository)
    user = use_cases.bootstrap_admin(email="admin@example.com", password="StrongPass123!")

    assert use_cases.start_password_reset(email="missing@example.com") is None
    reset_token = use_cases.start_password_reset(email=user.email)
    assert reset_token is not None

    use_cases.confirm_password_reset(reset_token=reset_token, new_password="NewStrong123!")

    assert repository.updated_passwords[user.id] == "hashed:NewStrong123!"
    assert repository.used_reset_tokens == ["reset-id"]


def test_password_reset_rejects_wrong_type_missing_and_expired_token() -> None:
    repository = FakeAuthRepository()
    jwt = FakeJwtService()
    use_cases = make_use_cases(repository, jwt)
    use_cases.bootstrap_admin(email="admin@example.com", password="StrongPass123!")
    reset_token = use_cases.start_password_reset(email="admin@example.com")
    assert reset_token is not None

    jwt.decoded[reset_token] = {"typ": "refresh", "sub": str(USER_ID)}
    with pytest.raises(AuthError, match="Invalid password reset token type"):
        use_cases.confirm_password_reset(reset_token=reset_token, new_password="NewStrong123!")

    jwt.decoded[reset_token] = {"typ": "password_reset", "sub": str(USER_ID)}
    repository.reset_tokens.clear()
    with pytest.raises(AuthError, match="invalid or used"):
        use_cases.confirm_password_reset(reset_token=reset_token, new_password="NewStrong123!")

    repository.reset_tokens[FakeTokenHasher().hash_token(reset_token)] = PasswordResetTokenRecord(
        id="reset-id",
        user_id=USER_ID,
        expires_at=datetime.now(UTC) - timedelta(seconds=1),
    )
    with pytest.raises(AuthError, match="expired"):
        use_cases.confirm_password_reset(reset_token=reset_token, new_password="NewStrong123!")
