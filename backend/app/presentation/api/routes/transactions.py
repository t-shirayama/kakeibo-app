from __future__ import annotations

from datetime import date
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.application.auth.ports import UserRecord
from app.application.common import Page
from app.application.reports import TransactionExportFilters
from app.application.transactions import TransactionCategoryError, TransactionUseCases
from app.bootstrap.income_transactions import apply_due_income_transactions
from app.bootstrap.container import build_report_use_cases, build_transaction_use_cases
from app.infrastructure.db.session import get_db_session
from app.presentation.api.dependencies import get_current_user, validate_csrf_token
from app.presentation.api.errors import http_exception_from_application_error
from app.presentation.api.routes.transaction_dtos import (
    SameShopCategoryRequest,
    SameShopCategoryResponse,
    SameShopCountResponse,
    TransactionListResponse,
    TransactionRequest,
    TransactionResponse,
    transaction_command_from_request,
    transaction_list_response,
    transaction_response,
)

router = APIRouter()


@router.get("", response_model=TransactionListResponse)
def list_transactions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    keyword: str | None = Query(default=None),
    category_id: UUID | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    sort_field: Literal["date", "amount"] = Query(default="date"),
    sort_direction: Literal["asc", "desc"] = Query(default="desc"),
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> TransactionListResponse:
    # API層ではHTTP入力をユースケース用のPage/Commandへ変換するだけに留める。
    apply_due_income_transactions(user_id=current_user.id, session=session)
    result = _use_cases(session).list_transactions(
        user_id=current_user.id,
        page=Page(page=page, page_size=page_size),
        keyword=keyword,
        category_id=category_id,
        date_from=date_from,
        date_to=date_to,
        sort_field=sort_field,
        sort_direction=sort_direction,
    )
    return transaction_list_response(result)


@router.get("/export")
def export_transactions(
    keyword: str | None = Query(default=None),
    category_id: UUID | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> Response:
    content = build_report_use_cases(session).export_workbook(
        user_id=current_user.id,
        filters=TransactionExportFilters(
            keyword=keyword,
            category_id=category_id,
            date_from=date_from,
            date_to=date_to,
        ),
    )
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="kakeibo-export.xlsx"'},
    )


@router.post("", response_model=TransactionResponse, dependencies=[Depends(validate_csrf_token)])
def create_transaction(
    request: TransactionRequest,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> TransactionResponse:
    try:
        transaction = _use_cases(session).create_transaction(user_id=current_user.id, command=transaction_command_from_request(request))
    except TransactionCategoryError as exc:
        raise http_exception_from_application_error(exc) from exc
    return transaction_response(transaction)


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    transaction_id: UUID,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> TransactionResponse:
    try:
        transaction = _use_cases(session).get_transaction(user_id=current_user.id, transaction_id=transaction_id)
    except TransactionCategoryError as exc:
        raise http_exception_from_application_error(exc) from exc
    return transaction_response(transaction)


@router.put("/{transaction_id}", response_model=TransactionResponse, dependencies=[Depends(validate_csrf_token)])
def update_transaction(
    transaction_id: UUID,
    request: TransactionRequest,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> TransactionResponse:
    try:
        transaction = _use_cases(session).update_transaction(
            user_id=current_user.id,
            transaction_id=transaction_id,
            command=transaction_command_from_request(request),
        )
    except TransactionCategoryError as exc:
        raise http_exception_from_application_error(exc) from exc
    return transaction_response(transaction)


@router.get("/{transaction_id}/same-shop-count", response_model=SameShopCountResponse)
def count_same_shop_transactions(
    transaction_id: UUID,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> SameShopCountResponse:
    try:
        count = _use_cases(session).count_same_shop_candidates(user_id=current_user.id, transaction_id=transaction_id)
    except TransactionCategoryError as exc:
        raise http_exception_from_application_error(exc) from exc
    return SameShopCountResponse(count=count)


@router.patch("/{transaction_id}/same-shop-category", response_model=SameShopCategoryResponse, dependencies=[Depends(validate_csrf_token)])
def update_same_shop_category(
    transaction_id: UUID,
    request: SameShopCategoryRequest,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> SameShopCategoryResponse:
    try:
        updated_count = _use_cases(session).update_same_shop_category(
            user_id=current_user.id,
            transaction_id=transaction_id,
            shop_name=request.shop_name,
            category_id=request.category_id,
        )
    except TransactionCategoryError as exc:
        raise http_exception_from_application_error(exc) from exc
    return SameShopCategoryResponse(updated_count=updated_count)


@router.delete("/{transaction_id}", dependencies=[Depends(validate_csrf_token)])
def delete_transaction(
    transaction_id: UUID,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> dict[str, str]:
    try:
        _use_cases(session).delete_transaction(user_id=current_user.id, transaction_id=transaction_id)
    except TransactionCategoryError as exc:
        raise http_exception_from_application_error(exc) from exc
    return {"status": "ok"}


def _use_cases(session: Session) -> TransactionUseCases:
    return build_transaction_use_cases(session)
