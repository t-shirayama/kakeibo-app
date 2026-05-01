from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from app.domain.auth import RefreshToken
from app.domain.repositories import RefreshTokenRepository


@dataclass(frozen=True, slots=True)
class RotatedRefreshToken:
    old_jti: UUID
    new_token: RefreshToken


class RefreshTokenRotationService:
    def __init__(self, repository: RefreshTokenRepository, refresh_token_days: int) -> None:
        self._repository = repository
        self._refresh_token_days = refresh_token_days

    def rotate(self, old_jti: UUID, user_id: UUID) -> RotatedRefreshToken:
        new_token = RefreshToken(
            jti=uuid4(),
            user_id=user_id,
            expires_at=datetime.now(UTC) + timedelta(days=self._refresh_token_days),
        )
        self._repository.revoke_and_replace(old_jti, new_token)
        return RotatedRefreshToken(old_jti=old_jti, new_token=new_token)

