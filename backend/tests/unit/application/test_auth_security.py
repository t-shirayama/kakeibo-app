from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest

from app.application.auth.csrf_service import CsrfTokenError, CsrfTokenService
from app.application.auth.password_hasher import PasswordHasher
from app.application.auth.password_policy import PasswordPolicy, PasswordPolicyError
from app.application.auth.refresh_rotation import RefreshTokenRotationService
from app.application.auth.token_hash import hash_token
from app.domain.auth import RefreshToken


class FakeRefreshTokenRepository:
    def __init__(self) -> None:
        self.replaced: list[tuple[UUID, RefreshToken]] = []

    def revoke_and_replace(self, old_jti: UUID, new_token: RefreshToken) -> None:
        self.replaced.append((old_jti, new_token))


def test_password_policy_accepts_recommended_shape() -> None:
    PasswordPolicy().validate("StrongPass123!")


@pytest.mark.parametrize("password", ["short1!", "lowercase123!", "UPPERCASE123!", "NoNumber!!!!", "NoSymbol1234"])
def test_password_policy_rejects_invalid_password(password: str) -> None:
    with pytest.raises(PasswordPolicyError):
        PasswordPolicy().validate(password)


def test_password_policy_reports_all_failed_requirements() -> None:
    with pytest.raises(PasswordPolicyError) as exc_info:
        PasswordPolicy().validate("short")

    message = str(exc_info.value)
    assert "at least 12 characters" in message
    assert "uppercase" in message
    assert "number" in message
    assert "symbol" in message


def test_password_hasher_verifies_password() -> None:
    hasher = PasswordHasher()

    password_hash = hasher.hash_password("StrongPass123!")

    assert hasher.verify("StrongPass123!", password_hash)
    assert not hasher.verify("WrongPass123!", password_hash)


def test_hash_token_is_deterministic_without_returning_raw_token() -> None:
    hashed = hash_token("refresh-token")

    assert hashed == hash_token("refresh-token")
    assert hashed != "refresh-token"
    assert len(hashed) == 64


def test_csrf_token_can_be_validated() -> None:
    service = CsrfTokenService(secret_key="secret", ttl_minutes=30)
    session_binding = "session-binding"

    token = service.issue_token(session_binding=session_binding)

    service.validate_token(token, session_binding=session_binding)


def test_csrf_token_rejects_tampering() -> None:
    service = CsrfTokenService(secret_key="secret", ttl_minutes=30)
    session_binding = "session-binding"

    token = service.issue_token(session_binding=session_binding) + "x"

    with pytest.raises(CsrfTokenError):
        service.validate_token(token, session_binding=session_binding)


def test_csrf_token_rejects_different_session_binding() -> None:
    service = CsrfTokenService(secret_key="secret", ttl_minutes=30)
    token = service.issue_token(session_binding="session-a")

    with pytest.raises(CsrfTokenError, match="does not match this session"):
        service.validate_token(token, session_binding="session-b")


def test_refresh_token_rotation_revokes_old_token_and_returns_replacement() -> None:
    repository = FakeRefreshTokenRepository()
    service = RefreshTokenRotationService(repository=repository, refresh_token_days=5)
    old_jti = uuid4()
    user_id = uuid4()

    rotated = service.rotate(old_jti=old_jti, user_id=user_id)

    assert rotated.old_jti == old_jti
    assert rotated.new_token.user_id == user_id
    assert rotated.new_token.jti != old_jti
    assert rotated.new_token.expires_at > datetime.now(UTC)
    assert repository.replaced == [(old_jti, rotated.new_token)]
