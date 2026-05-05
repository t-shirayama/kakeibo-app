from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.application.auth.ports import UserRecord
from app.bootstrap.container import build_pdf_upload_use_cases
from app.application.importing.upload_import import PdfUploadError, PdfUploadUseCases
from app.domain.entities import Upload, UploadStatus
from app.infrastructure.db.session import get_db_session
from app.presentation.api.dependencies import get_current_user, validate_csrf_token

router = APIRouter()


class UploadResponse(BaseModel):
    upload_id: str
    file_name: str
    stored_file_path: str
    status: UploadStatus
    imported_count: int
    error_message: str | None
    uploaded_at: datetime


@router.post("", response_model=UploadResponse, dependencies=[Depends(validate_csrf_token)])
async def upload_pdf(
    file: UploadFile = File(...),
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> UploadResponse:
    content = await file.read()
    try:
        upload = _use_cases(session).import_pdf(
            user_id=current_user.id,
            file_name=file.filename or "statement.pdf",
            content=content,
        )
    except PdfUploadError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _upload_response(upload)


@router.get("", response_model=list[UploadResponse])
def list_uploads(
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> list[UploadResponse]:
    return [_upload_response(upload) for upload in _use_cases(session).list_uploads(user_id=current_user.id)]


@router.get("/{upload_id}", response_model=UploadResponse)
def get_upload(
    upload_id: UUID,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> UploadResponse:
    try:
        upload = _use_cases(session).get_upload(user_id=current_user.id, upload_id=upload_id)
    except PdfUploadError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return _upload_response(upload)


@router.delete("/{upload_id}", dependencies=[Depends(validate_csrf_token)])
def delete_upload(
    upload_id: UUID,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict[str, str]:
    try:
        _use_cases(session).delete_upload(user_id=current_user.id, upload_id=upload_id)
    except PdfUploadError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"status": "ok"}


def _use_cases(session: Session) -> PdfUploadUseCases:
    return build_pdf_upload_use_cases(session)


def _upload_response(upload: Upload) -> UploadResponse:
    return UploadResponse(
        upload_id=str(upload.id),
        file_name=upload.file_name,
        stored_file_path=upload.stored_file_path,
        status=upload.status,
        imported_count=upload.imported_count,
        error_message=upload.error_message,
        uploaded_at=upload.uploaded_at,
    )
