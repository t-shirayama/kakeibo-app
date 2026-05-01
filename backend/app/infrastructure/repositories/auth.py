from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.application.auth.ports import PasswordResetTokenRecord, RefreshTokenRecord, UserRecord
from app.infrastructure.models.password_reset_token import PasswordResetTokenModel
from app.infrastructure.models.refresh_token import RefreshTokenModel
from app.infrastructure.models.user import UserModel


class AuthRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def has_any_user(self) -> bool:
        count = self._session.scalar(select(func.count()).select_from(UserModel))
        return bool(count)

    def get_active_user_by_email(self, email: str) -> UserRecord | None:
        user = self._session.scalar(
            select(UserModel).where(UserModel.email == email.lower(), UserModel.deleted_at.is_(None))
        )
        return self._to_user_record(user)

    def get_active_user_by_id(self, user_id: UUID) -> UserRecord | None:
        user = self._session.get(UserModel, str(user_id))
        if user is None or user.deleted_at is not None:
            return None
        return self._to_user_record(user)

    def create_user(self, *, email: str, password_hash: str, is_admin: bool) -> UserRecord:
        user = UserModel(email=email.lower(), password_hash=password_hash, is_admin=is_admin)
        self._session.add(user)
        self._session.commit()
        self._session.refresh(user)
        record = self._to_user_record(user)
        if record is None:
            raise RuntimeError("Failed to create user.")
        return record

    def update_user_password(self, *, user_id: UUID, password_hash: str) -> None:
        user = self._session.get(UserModel, str(user_id))
        if user is None or user.deleted_at is not None:
            raise ValueError("User not found.")
        user.password_hash = password_hash
        user.updated_at = datetime.now(UTC)
        self._session.commit()

    def create_refresh_token(
        self,
        *,
        token_id: str,
        user_id: UUID,
        token_hash: str,
        expires_at: datetime,
        replaced_token_id: str | None = None,
    ) -> None:
        token = RefreshTokenModel(
            id=token_id,
            user_id=str(user_id),
            token_hash=token_hash,
            expires_at=expires_at,
            replaced_by_token_id=replaced_token_id,
        )
        self._session.add(token)
        self._session.commit()

    def get_active_refresh_token(self, token_hash: str) -> RefreshTokenRecord | None:
        token = self._session.scalar(
            select(RefreshTokenModel).where(
                RefreshTokenModel.token_hash == token_hash,
                RefreshTokenModel.revoked_at.is_(None),
            )
        )
        if token is None:
            return None
        return RefreshTokenRecord(id=token.id, user_id=UUID(token.user_id), expires_at=token.expires_at)

    def revoke_refresh_token(self, token_id: str, *, revoked_at: datetime) -> None:
        token = self._session.get(RefreshTokenModel, token_id)
        if token is not None and token.revoked_at is None:
            token.revoked_at = revoked_at
            self._session.commit()

    def create_password_reset_token(self, *, user_id: UUID, token_hash: str, expires_at: datetime) -> None:
        token = PasswordResetTokenModel(
            id=str(uuid4()),
            user_id=str(user_id),
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self._session.add(token)
        self._session.commit()

    def get_active_password_reset_token(self, token_hash: str) -> PasswordResetTokenRecord | None:
        token = self._session.scalar(
            select(PasswordResetTokenModel).where(
                PasswordResetTokenModel.token_hash == token_hash,
                PasswordResetTokenModel.used_at.is_(None),
            )
        )
        if token is None:
            return None
        return PasswordResetTokenRecord(id=token.id, user_id=UUID(token.user_id), expires_at=token.expires_at)

    def mark_password_reset_token_used(self, token_id: str, *, used_at: datetime) -> None:
        token = self._session.get(PasswordResetTokenModel, token_id)
        if token is not None and token.used_at is None:
            token.used_at = used_at
            self._session.commit()

    def _to_user_record(self, user: UserModel | None) -> UserRecord | None:
        if user is None:
            return None
        return UserRecord(
            id=UUID(user.id),
            email=user.email,
            password_hash=user.password_hash,
            is_admin=user.is_admin,
        )
