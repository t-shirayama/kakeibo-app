from __future__ import annotations

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.application.auth.ports import UserRecord
from app.application.common import Page, PageResult
from app.application.reports import ReportUseCases, TransactionExportFilters
from app.application.transactions import TransactionCategoryError, TransactionCategoryUseCases, TransactionCommand
from app.application.transaction_views import TransactionWithCategory
from app.domain.entities import Transaction, TransactionType
from app.infrastructure.db.session import get_db_session
from app.infrastructure.repositories.transactions import TransactionCategoryRepository
from app.presentation.api.dependencies import get_current_user, validate_csrf_token
from app.presentation.api.routes.income_settings import apply_due_income_transactions

router = APIRouter()


class TransactionResponse(BaseModel):
    transaction_id: str
    category_id: str
    display_category_id: str | None = None
    category_name: str | None = None
    category_color: str | None = None
    transaction_date: date
    shop_name: str
    amount: int
    transaction_type: TransactionType
    payment_method: str | None
    card_user_name: str | None
    memo: str | None
    source_upload_id: str | None
    source_file_name: str | None
    source_row_number: int | None
    source_page_number: int | None
    source_format: str | None
    source_hash: str | None


class TransactionListResponse(BaseModel):
    items: list[TransactionResponse]
    total: int
    page: int
    page_size: int


class TransactionRequest(BaseModel):
    transaction_date: date
    shop_name: str = Field(min_length=1, max_length=255)
    amount: int
    transaction_type: TransactionType = TransactionType.EXPENSE
    category_id: UUID | None = None
    payment_method: str | None = Field(default=None, max_length=100)
    card_user_name: str | None = Field(default=None, max_length=100)
    memo: str | None = Field(default=None, max_length=1000)


class SameShopCountResponse(BaseModel):
    count: int


class SameShopCategoryRequest(BaseModel):
    shop_name: str = Field(min_length=1, max_length=255)
    category_id: UUID


class SameShopCategoryResponse(BaseModel):
    updated_count: int


@router.get("", response_model=TransactionListResponse)
def list_transactions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    keyword: str | None = Query(default=None),
    category_id: UUID | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
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
    )
    return _list_response(result)


@router.get("/export")
def export_transactions(
    keyword: str | None = Query(default=None),
    category_id: UUID | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> Response:
    content = ReportUseCases(TransactionCategoryRepository(session)).export_workbook(
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
        transaction = _use_cases(session).create_transaction(user_id=current_user.id, command=_command(request))
    except TransactionCategoryError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _transaction_response(transaction)


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    transaction_id: UUID,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> TransactionResponse:
    try:
        transaction = _use_cases(session).get_transaction(user_id=current_user.id, transaction_id=transaction_id)
    except TransactionCategoryError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return _transaction_response(transaction)


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
            command=_command(request),
        )
    except TransactionCategoryError as exc:
        raise HTTPException(status_code=404 if "not found" in str(exc).lower() else 400, detail=str(exc)) from exc
    return _transaction_response(transaction)


@router.get("/{transaction_id}/same-shop-count", response_model=SameShopCountResponse)
def count_same_shop_transactions(
    transaction_id: UUID,
    current_user: UserRecord = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> SameShopCountResponse:
    try:
        count = _use_cases(session).count_same_shop_candidates(user_id=current_user.id, transaction_id=transaction_id)
    except TransactionCategoryError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
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
        raise HTTPException(status_code=404 if "not found" in str(exc).lower() else 400, detail=str(exc)) from exc
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
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"status": "ok"}


def _use_cases(session: Session) -> TransactionCategoryUseCases:
    return TransactionCategoryUseCases(TransactionCategoryRepository(session))


def _command(request: TransactionRequest) -> TransactionCommand:
    # 画面から編集できない取込元情報は、作成・更新リクエストには含めない。
    return TransactionCommand(
        transaction_date=request.transaction_date,
        shop_name=request.shop_name,
        amount=request.amount,
        transaction_type=request.transaction_type,
        category_id=request.category_id,
        payment_method=request.payment_method,
        card_user_name=request.card_user_name,
        memo=request.memo,
    )


def _list_response(result: PageResult[TransactionWithCategory]) -> TransactionListResponse:
    return TransactionListResponse(
        items=[_transaction_row_response(row) for row in result.items],
        total=result.total,
        page=result.page,
        page_size=result.page_size,
    )


def _transaction_response(transaction: Transaction) -> TransactionResponse:
    return TransactionResponse(
        transaction_id=str(transaction.id),
        category_id=str(transaction.category_id),
        transaction_date=transaction.transaction_date,
        shop_name=transaction.shop_name,
        amount=transaction.amount.amount,
        transaction_type=transaction.transaction_type,
        payment_method=transaction.payment_method,
        card_user_name=transaction.card_user_name,
        memo=transaction.memo,
        source_upload_id=str(transaction.source_upload_id) if transaction.source_upload_id else None,
        source_file_name=transaction.source_file_name,
        source_row_number=transaction.source_row_number,
        source_page_number=transaction.source_page_number,
        source_format=transaction.source_format,
        source_hash=transaction.source_hash,
    )


def _transaction_row_response(row: TransactionWithCategory) -> TransactionResponse:
    response = _transaction_response(row.transaction)
    response.display_category_id = str(row.display_category_id)
    response.category_name = row.category_name
    response.category_color = row.category_color
    return response
