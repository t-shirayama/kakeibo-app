from typing import Protocol
from uuid import UUID

from app.domain.auth import RefreshToken
from app.domain.entities import Transaction


class TransactionRepository(Protocol):
    def get(self, transaction_id: UUID) -> Transaction | None:
        raise NotImplementedError

    def save(self, transaction: Transaction) -> None:
        raise NotImplementedError


class RefreshTokenRepository(Protocol):
    def get(self, jti: UUID) -> RefreshToken | None:
        raise NotImplementedError

    def save(self, refresh_token: RefreshToken) -> None:
        raise NotImplementedError

    def revoke_and_replace(self, old_jti: UUID, new_token: RefreshToken) -> None:
        raise NotImplementedError

