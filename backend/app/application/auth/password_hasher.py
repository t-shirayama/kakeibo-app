from __future__ import annotations

import hashlib
import hmac
from base64 import urlsafe_b64decode, urlsafe_b64encode
from secrets import token_bytes


class PasswordHasher:
    algorithm = "pbkdf2_sha256"
    iterations = 390_000
    salt_bytes = 16

    def hash_password(self, password: str) -> str:
        salt = token_bytes(self.salt_bytes)
        digest = self._hash(password=password, salt=salt, iterations=self.iterations)
        return "$".join(
            [
                self.algorithm,
                str(self.iterations),
                self._encode(salt),
                self._encode(digest),
            ]
        )

    def verify(self, password: str, password_hash: str) -> bool:
        algorithm, iterations_text, salt_text, digest_text = password_hash.split("$", maxsplit=3)
        if algorithm != self.algorithm:
            return False

        iterations = int(iterations_text)
        salt = self._decode(salt_text)
        expected = self._decode(digest_text)
        actual = self._hash(password=password, salt=salt, iterations=iterations)
        return hmac.compare_digest(actual, expected)

    def _hash(self, *, password: str, salt: bytes, iterations: int) -> bytes:
        return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)

    def _encode(self, value: bytes) -> str:
        return urlsafe_b64encode(value).decode("ascii").rstrip("=")

    def _decode(self, value: str) -> bytes:
        padding = "=" * (-len(value) % 4)
        return urlsafe_b64decode(value + padding)
