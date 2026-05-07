from __future__ import annotations

from app.infrastructure.models.transaction import TransactionModel


def transaction_order_by(*, sort_field: str, sort_direction: str) -> tuple[object, ...]:
    descending = sort_direction != "asc"
    if sort_field == "amount":
        amount_order = TransactionModel.amount.desc() if descending else TransactionModel.amount.asc()
        date_order = TransactionModel.transaction_date.desc() if descending else TransactionModel.transaction_date.asc()
        created_order = TransactionModel.created_at.desc() if descending else TransactionModel.created_at.asc()
        return (amount_order, date_order, created_order)

    return date_order_by(descending=descending)


def recent_transaction_order_by() -> tuple[object, ...]:
    return date_order_by(descending=True)


def date_order_by(*, descending: bool) -> tuple[object, ...]:
    date_order = TransactionModel.transaction_date.desc() if descending else TransactionModel.transaction_date.asc()
    created_order = TransactionModel.created_at.desc() if descending else TransactionModel.created_at.asc()
    return (date_order, created_order)
