from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

import jwt

from app.infrastructure.config import Settings


class JwtService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def issue_access_token(self, subject: str) -> str:
        return self._encode(
            subject=subject,
            expires_in=timedelta(minutes=self._settings.access_token_minutes),
            token_type="access",
        )

    def issue_refresh_token(self, subject: str) -> str:
        return self._encode(
            subject=subject,
            expires_in=timedelta(days=self._settings.refresh_token_days),
            token_type="refresh",
        )

    def decode(self, token: str) -> dict[str, Any]:
        return jwt.decode(
            token,
            self._settings.jwt_secret,
            algorithms=[self._settings.jwt_algorithm],
        )

    def _encode(self, subject: str, expires_in: timedelta, token_type: str) -> str:
        now = datetime.now(UTC)
        payload = {
            "sub": subject,
            "typ": token_type,
            "iat": int(now.timestamp()),
            "exp": int((now + expires_in).timestamp()),
            "jti": str(uuid4()),
        }
        return jwt.encode(
            payload,
            self._settings.jwt_secret,
            algorithm=self._settings.jwt_algorithm,
        )

