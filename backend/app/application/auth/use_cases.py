from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

from app.application.auth.password_policy import PasswordPolicy
from app.application.auth.ports import (
    AuthRepositoryPort,
    AuthSettings,
    JwtServicePort,
    PasswordHasherPort,
    TokenHasherPort,
    UserRecord,
)


class AuthError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class AuthTokens:
    access_token: str
    refresh_token: str
    access_max_age_seconds: int
    refresh_max_age_seconds: int


class AuthUseCases:
    # 認証まわりの判断を集約し、Cookie操作やHTTP詳細はAPI層へ分離する。
    def __init__(
        self,
        repository: AuthRepositoryPort,
        settings: AuthSettings,
        jwt_service: JwtServicePort,
        password_hasher: PasswordHasherPort,
        token_hasher: TokenHasherPort,
        password_policy: PasswordPolicy | None = None,
    ) -> None:
        self._repository = repository
        self._settings = settings
        self._jwt = jwt_service
        self._password_policy = password_policy or PasswordPolicy()
        self._password_hasher = password_hasher
        self._token_hasher = token_hasher

    def bootstrap_admin(self, *, email: str, password: str) -> UserRecord:
        if self._repository.has_any_user():
            raise AuthError("Initial admin already exists.")
        return self._create_user(email=email, password=password, is_admin=True)

    def create_user_by_admin(self, *, admin_user: UserRecord, email: str, password: str, is_admin: bool = False) -> UserRecord:
        if not admin_user.is_admin:
            raise AuthError("Admin privileges are required.")
        return self._create_user(email=email, password=password, is_admin=is_admin)

    def login(self, *, email: str, password: str) -> tuple[UserRecord, AuthTokens]:
        user = self._repository.get_active_user_by_email(email)
        if user is None or not self._password_hasher.verify(password, user.password_hash):
            raise AuthError("Invalid email or password.")
        return user, self._issue_tokens(user.id)

    def refresh(self, *, refresh_token: str) -> AuthTokens:
        payload = self._jwt.decode(refresh_token)
        if payload.get("typ") != "refresh":
            raise AuthError("Invalid refresh token type.")

        # JWTだけでなくDB上の有効なハッシュも確認し、失効済みトークンの再利用を防ぐ。
        token_record = self._repository.get_active_refresh_token(self._token_hasher.hash_token(refresh_token))
        if token_record is None:
            raise AuthError("Refresh token is invalid or revoked.")

        now = datetime.now(UTC)
        if token_record.expires_at < now:
            raise AuthError("Refresh token has expired.")

        user_id = UUID(str(payload["sub"]))
        token_jti = str(payload["jti"])
        if token_record.id != token_jti or token_record.user_id != user_id:
            raise AuthError("Refresh token payload does not match persisted token.")
        # ローテーションにより、使われたリフレッシュトークンは即座に失効させる。
        self._repository.revoke_refresh_token(token_record.id, revoked_at=now)
        return self._issue_tokens(user_id, replaced_token_id=token_jti)

    def logout(self, *, refresh_token: str | None) -> None:
        if not refresh_token:
            return
        token_record = self._repository.get_active_refresh_token(self._token_hasher.hash_token(refresh_token))
        if token_record is not None:
            self._repository.revoke_refresh_token(token_record.id, revoked_at=datetime.now(UTC))

    def start_password_reset(self, *, email: str) -> str | None:
        user = self._repository.get_active_user_by_email(email)
        if user is None:
            # メールアドレスの存在有無を画面側で推測されないよう、呼び出し元では同じ応答にする。
            return None

        reset_token = self._jwt.issue_reset_token(str(user.id))
        self._repository.create_password_reset_token(
            user_id=user.id,
            token_hash=self._token_hasher.hash_token(reset_token),
            expires_at=datetime.now(UTC) + timedelta(minutes=30),
        )
        return reset_token

    def confirm_password_reset(self, *, reset_token: str, new_password: str) -> None:
        payload = self._jwt.decode(reset_token)
        if payload.get("typ") != "password_reset":
            raise AuthError("Invalid password reset token type.")

        token_record = self._repository.get_active_password_reset_token(self._token_hasher.hash_token(reset_token))
        if token_record is None:
            raise AuthError("Password reset token is invalid or used.")
        if token_record.expires_at < datetime.now(UTC):
            raise AuthError("Password reset token has expired.")

        self._password_policy.validate(new_password)
        self._repository.update_user_password(
            user_id=UUID(str(payload["sub"])),
            password_hash=self._password_hasher.hash_password(new_password),
        )
        self._repository.mark_password_reset_token_used(token_record.id, used_at=datetime.now(UTC))

    def _create_user(self, *, email: str, password: str, is_admin: bool) -> UserRecord:
        self._password_policy.validate(password)
        if self._repository.get_active_user_by_email(email) is not None:
            raise AuthError("Email is already registered.")
        return self._repository.create_user(
            email=email,
            password_hash=self._password_hasher.hash_password(password),
            is_admin=is_admin,
        )

    def _issue_tokens(self, user_id: UUID, replaced_token_id: str | None = None) -> AuthTokens:
        access_token = self._jwt.issue_access_token(str(user_id))
        refresh_token = self._jwt.issue_refresh_token(str(user_id))
        refresh_payload = self._jwt.decode(refresh_token)
        self._repository.create_refresh_token(
            token_id=str(refresh_payload["jti"]),
            user_id=user_id,
            token_hash=self._token_hasher.hash_token(refresh_token),
            expires_at=datetime.now(UTC) + timedelta(days=self._settings.refresh_token_days),
            replaced_token_id=replaced_token_id,
        )
        return AuthTokens(
            access_token=access_token,
            refresh_token=refresh_token,
            access_max_age_seconds=self._settings.access_token_minutes * 60,
            refresh_max_age_seconds=self._settings.refresh_token_days * 24 * 60 * 60,
        )
