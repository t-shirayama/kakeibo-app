from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest

from app.application.auth.password_policy import PasswordPolicy, PasswordPolicyError
from app.application.auth.ports import AuthSettings
from app.application.auth.refresh_rotation import RefreshTokenRotationService
from app.domain.auth import RefreshToken
from app.infrastructure.security import CsrfTokenError, CsrfTokenService, JwtService, PasswordHasher, TokenHasher


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


def test_password_hasher_rejects_unsupported_algorithm() -> None:
    hasher = PasswordHasher()
    password_hash = hasher.hash_password("StrongPass123!").replace("pbkdf2_sha256", "legacy", 1)

    assert hasher.verify("StrongPass123!", password_hash) is False


def test_hash_token_is_deterministic_without_returning_raw_token() -> None:
    hasher = TokenHasher()
    hashed = hasher.hash_token("refresh-token")

    assert hashed == hasher.hash_token("refresh-token")
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


def test_csrf_token_rejects_malformed_and_expired_tokens() -> None:
    service = CsrfTokenService(secret_key="secret", ttl_minutes=0)

    with pytest.raises(CsrfTokenError, match="Invalid CSRF token"):
        service.validate_token("malformed-token", session_binding="session")

    token = service.issue_token(session_binding="session")
    with pytest.raises(CsrfTokenError, match="expired"):
        service.validate_token(token, session_binding="session")


def test_csrf_token_rejects_different_session_binding() -> None:
    service = CsrfTokenService(secret_key="secret", ttl_minutes=30)
    token = service.issue_token(session_binding="session-a")

    with pytest.raises(CsrfTokenError, match="does not match this session"):
        service.validate_token(token, session_binding="session-b")


def test_jwt_service_issues_and_decodes_all_token_types() -> None:
    service = JwtService(
        AuthSettings(
            jwt_secret="test-secret-key-with-32-bytes-minimum!!",
            jwt_algorithm="HS256",
            access_token_minutes=15,
            refresh_token_days=7,
        )
    )

    assert service.decode(service.issue_access_token("user-id"))["typ"] == "access"
    assert service.decode(service.issue_refresh_token("user-id"))["typ"] == "refresh"
    assert service.decode(service.issue_reset_token("user-id"))["typ"] == "password_reset"


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
