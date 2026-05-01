from fastapi import APIRouter
from pydantic import BaseModel

from app.application.auth.csrf_service import CsrfTokenService

router = APIRouter()


class CsrfTokenResponse(BaseModel):
    csrf_token: str


@router.get("/csrf", response_model=CsrfTokenResponse)
def get_csrf_token() -> CsrfTokenResponse:
    return CsrfTokenResponse(csrf_token=CsrfTokenService().issue_token())
