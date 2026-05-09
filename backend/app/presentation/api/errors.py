from __future__ import annotations

from fastapi import HTTPException

from app.application.errors import ApplicationError


def http_exception_from_application_error(
    exc: ApplicationError,
    *,
    status_code: int | None = None,
) -> HTTPException:
    return HTTPException(status_code=status_code or exc.status_code, detail=str(exc))
