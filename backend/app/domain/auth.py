from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True, slots=True)
class RefreshToken:
    jti: UUID
    user_id: UUID
    expires_at: datetime
    revoked_at: datetime | None = None
    replaced_by_jti: UUID | None = None

    @property
    def is_revoked(self) -> bool:
        return self.revoked_at is not None

