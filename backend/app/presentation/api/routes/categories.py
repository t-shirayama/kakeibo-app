from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.application.auth.ports import UserRecord
from app.application.transactions import CategoryCommand, TransactionCategoryError, TransactionCategoryUseCases
from app.domain.entities import Category
from app.infrastructure.db.session import get_db_session
from app.infrastructure.repositories.transactions import TransactionCategoryRepository
from app.presentation.api.dependencies import get_current_user, validate_csrf_token

router = APIRouter()


class CategoryResponse(BaseModel):
    category_id: str
    name: str
    color: str
    description: str | None
    is_active: bool


class CategoryRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    color: str = Field(min_length=1, max_length=20)
    description: str | None = Field(default=None, max_length=255)


@router.get("", response_model=list[CategoryResponse])
def list_categories(
    include_inactive: bool = False,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> list[CategoryResponse]:
    categories = _use_cases(session).list_categories(user_id=current_user.id, include_inactive=include_inactive)
    return [_category_response(category) for category in categories]


@router.post("", response_model=CategoryResponse, dependencies=[Depends(validate_csrf_token)])
def create_category(
    request: CategoryRequest,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> CategoryResponse:
    try:
        category = _use_cases(session).create_category(
            user_id=current_user.id,
            command=CategoryCommand(
                name=request.name,
                color=request.color,
                description=request.description,
            ),
        )
    except TransactionCategoryError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _category_response(category)


@router.put("/{category_id}", response_model=CategoryResponse, dependencies=[Depends(validate_csrf_token)])
def update_category(
    category_id: UUID,
    request: CategoryRequest,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> CategoryResponse:
    try:
        category = _use_cases(session).update_category(
            user_id=current_user.id,
            category_id=category_id,
            command=CategoryCommand(
                name=request.name,
                color=request.color,
                description=request.description,
            ),
        )
    except TransactionCategoryError as exc:
        raise HTTPException(status_code=404 if "not found" in str(exc).lower() else 400, detail=str(exc)) from exc
    return _category_response(category)


@router.delete("/{category_id}", dependencies=[Depends(validate_csrf_token)])
def delete_category(
    category_id: UUID,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict[str, str]:
    try:
        _use_cases(session).deactivate_category(user_id=current_user.id, category_id=category_id)
    except TransactionCategoryError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"status": "ok"}


def _use_cases(session: Session) -> TransactionCategoryUseCases:
    return TransactionCategoryUseCases(TransactionCategoryRepository(session))


def _category_response(category: Category) -> CategoryResponse:
    return CategoryResponse(
        category_id=str(category.id),
        name=category.name,
        color=category.color,
        description=category.description,
        is_active=category.is_active,
    )
