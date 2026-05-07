from __future__ import annotations

from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field

from app.application.common import PageResult
from app.application.transaction_views import TransactionWithCategory
from app.application.transactions import TransactionCommand
from app.domain.entities import Transaction, TransactionType


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


def transaction_command_from_request(request: TransactionRequest) -> TransactionCommand:
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


def transaction_list_response(result: PageResult[TransactionWithCategory]) -> TransactionListResponse:
    return TransactionListResponse(
        items=[transaction_row_response(row) for row in result.items],
        total=result.total,
        page=result.page,
        page_size=result.page_size,
    )


def transaction_response(transaction: Transaction) -> TransactionResponse:
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


def transaction_row_response(row: TransactionWithCategory) -> TransactionResponse:
    response = transaction_response(row.transaction)
    response.display_category_id = str(row.display_category_id)
    response.category_name = row.category_name
    response.category_color = row.category_color
    return response
