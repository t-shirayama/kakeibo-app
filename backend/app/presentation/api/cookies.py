from fastapi import Response

from app.infrastructure.config import Settings


def set_auth_cookie(response: Response, name: str, value: str, max_age_seconds: int, settings: Settings) -> None:
    response.set_cookie(
        key=name,
        value=value,
        max_age=max_age_seconds,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
    )


def delete_auth_cookie(response: Response, name: str, settings: Settings) -> None:
    response.delete_cookie(
        key=name,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
    )
