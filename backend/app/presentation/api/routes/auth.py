from fastapi import APIRouter
from pydantic import BaseModel

from app.application.auth.csrf_service import CsrfTokenService
from app.infrastructure.config import get_settings

router = APIRouter()


class CsrfTokenResponse(BaseModel):
    csrf_token: str


@router.get("/csrf", response_model=CsrfTokenResponse)
def get_csrf_token() -> CsrfTokenResponse:
    settings = get_settings()
    service = CsrfTokenService(secret_key=settings.jwt_secret, ttl_minutes=settings.csrf_token_minutes)
    return CsrfTokenResponse(csrf_token=service.issue_token())
