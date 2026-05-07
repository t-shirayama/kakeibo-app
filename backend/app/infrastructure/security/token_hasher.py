from __future__ import annotations

from hashlib import sha256


class TokenHasher:
    def hash_token(self, token: str) -> str:
        return sha256(token.encode("utf-8")).hexdigest()
