from __future__ import annotations


class ApplicationError(ValueError):
    status_code = 400
    error_code = "bad_request"

    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        error_code: str | None = None,
        details: object | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code if status_code is not None else self.status_code
        self.error_code = error_code if error_code is not None else self.error_code
        self.details = details

    @classmethod
    def not_found(cls, message: str) -> "ApplicationError":
        return cls(message, status_code=404, error_code="not_found")
