from __future__ import annotations

import hmac
from base64 import urlsafe_b64decode, urlsafe_b64encode
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from secrets import token_urlsafe


class CsrfTokenError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class CsrfTokenService:
    secret_key: str
    ttl_minutes: int = 30

    def issue_token(self) -> str:
        nonce = token_urlsafe(32)
        issued_at = int(datetime.now(UTC).timestamp())
        payload = f"{issued_at}.{nonce}"
        signature = self._sign(payload)
        return self._encode(f"{payload}.{signature}")

    def validate_token(self, token: str) -> None:
        try:
            decoded = self._decode(token)
            issued_at_text, nonce, signature = decoded.split(".", maxsplit=2)
        except ValueError as exc:
            raise CsrfTokenError("Invalid CSRF token.") from exc

        payload = f"{issued_at_text}.{nonce}"
        if not hmac.compare_digest(signature, self._sign(payload)):
            raise CsrfTokenError("Invalid CSRF token signature.")

        issued_at = datetime.fromtimestamp(int(issued_at_text), tz=UTC)
        expires_at = issued_at + timedelta(minutes=self.ttl_minutes)
        if datetime.now(UTC) > expires_at:
            raise CsrfTokenError("CSRF token has expired.")

    def _sign(self, payload: str) -> str:
        return hmac.new(self.secret_key.encode("utf-8"), payload.encode("utf-8"), sha256).hexdigest()

    def _encode(self, value: str) -> str:
        return urlsafe_b64encode(value.encode("utf-8")).decode("ascii").rstrip("=")

    def _decode(self, value: str) -> str:
        padding = "=" * (-len(value) % 4)
        return urlsafe_b64decode(value + padding).decode("utf-8")
