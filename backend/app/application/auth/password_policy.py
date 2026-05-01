from __future__ import annotations

import re


class PasswordPolicyError(ValueError):
    pass


class PasswordPolicy:
    def __init__(self, min_length: int = 12) -> None:
        self._min_length = min_length

    def validate(self, password: str) -> None:
        failures: list[str] = []
        if len(password) < self._min_length:
            failures.append(f"Password must be at least {self._min_length} characters.")
        if not re.search(r"[A-Z]", password):
            failures.append("Password must include an uppercase letter.")
        if not re.search(r"[a-z]", password):
            failures.append("Password must include a lowercase letter.")
        if not re.search(r"\d", password):
            failures.append("Password must include a number.")
        if not re.search(r"[^A-Za-z0-9]", password):
            failures.append("Password must include a symbol.")

        if failures:
            raise PasswordPolicyError(" ".join(failures))
