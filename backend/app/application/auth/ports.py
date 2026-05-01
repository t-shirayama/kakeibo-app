from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol
from uuid import UUID


@dataclass(frozen=True, slots=True)
class UserRecord:
    id: UUID
    email: str
    password_hash: str
    is_admin: bool


@dataclass(frozen=True, slots=True)
class RefreshTokenRecord:
    id: str
    user_id: UUID
    expires_at: datetime


@dataclass(frozen=True, slots=True)
class PasswordResetTokenRecord:
    id: str
    user_id: UUID
    expires_at: datetime


class AuthRepositoryPort(Protocol):
    def has_any_user(self) -> bool:
        raise NotImplementedError

    def get_active_user_by_email(self, email: str) -> UserRecord | None:
        raise NotImplementedError

    def get_active_user_by_id(self, user_id: UUID) -> UserRecord | None:
        raise NotImplementedError

    def create_user(self, *, email: str, password_hash: str, is_admin: bool) -> UserRecord:
        raise NotImplementedError

    def update_user_password(self, *, user_id: UUID, password_hash: str) -> None:
        raise NotImplementedError

    def create_refresh_token(
        self,
        *,
        token_id: str,
        user_id: UUID,
        token_hash: str,
        expires_at: datetime,
        replaced_token_id: str | None = None,
    ) -> None:
        raise NotImplementedError

    def get_active_refresh_token(self, token_hash: str) -> RefreshTokenRecord | None:
        raise NotImplementedError

    def revoke_refresh_token(self, token_id: str, *, revoked_at: datetime) -> None:
        raise NotImplementedError

    def create_password_reset_token(self, *, user_id: UUID, token_hash: str, expires_at: datetime) -> None:
        raise NotImplementedError

    def get_active_password_reset_token(self, token_hash: str) -> PasswordResetTokenRecord | None:
        raise NotImplementedError

    def mark_password_reset_token_used(self, token_id: str, *, used_at: datetime) -> None:
        raise NotImplementedError
