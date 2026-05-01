from __future__ import annotations

import pytest

from app.application.auth.csrf_service import CsrfTokenError, CsrfTokenService
from app.application.auth.password_hasher import PasswordHasher
from app.application.auth.password_policy import PasswordPolicy, PasswordPolicyError


def test_password_policy_accepts_recommended_shape() -> None:
    PasswordPolicy().validate("StrongPass123!")


@pytest.mark.parametrize("password", ["short1!", "lowercase123!", "UPPERCASE123!", "NoNumber!!!!", "NoSymbol1234"])
def test_password_policy_rejects_invalid_password(password: str) -> None:
    with pytest.raises(PasswordPolicyError):
        PasswordPolicy().validate(password)


def test_password_hasher_verifies_password() -> None:
    hasher = PasswordHasher()

    password_hash = hasher.hash_password("StrongPass123!")

    assert hasher.verify("StrongPass123!", password_hash)
    assert not hasher.verify("WrongPass123!", password_hash)


def test_csrf_token_can_be_validated() -> None:
    service = CsrfTokenService(secret_key="secret", ttl_minutes=30)

    token = service.issue_token()

    service.validate_token(token)


def test_csrf_token_rejects_tampering() -> None:
    service = CsrfTokenService(secret_key="secret", ttl_minutes=30)

    token = service.issue_token() + "x"

    with pytest.raises(CsrfTokenError):
        service.validate_token(token)
