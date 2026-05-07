from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain.entities import Transaction
from app.infrastructure.models.transaction import TransactionModel
from app.infrastructure.repositories.mappers import to_transaction


class TransactionRepository:
    # 明細の保存と更新だけを担当し、一覧検索やカテゴリ表示の都合は持ち込まない。
    def __init__(self, session: Session) -> None:
        self._session = session

    def next_id(self) -> UUID:
        return uuid4()

    def create_transaction(self, transaction: Transaction) -> Transaction:
        model = TransactionModel(
            id=str(transaction.id),
            user_id=str(transaction.user_id),
            category_id=str(transaction.category_id),
            transaction_date=transaction.transaction_date,
            shop_name=transaction.shop_name,
            amount=transaction.amount.amount,
            transaction_type=transaction.transaction_type.value,
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
        self._session.add(model)
        self._session.commit()
        self._session.refresh(model)
        return to_transaction(model)

    def source_hash_exists(self, *, user_id: UUID, source_hash: str) -> bool:
        count = self._session.scalar(
            select(func.count())
            .select_from(TransactionModel)
            .where(
                TransactionModel.user_id == str(user_id),
                TransactionModel.source_hash == source_hash,
                TransactionModel.deleted_at.is_(None),
            )
        )
        return bool(count)

    def get_transaction(self, *, user_id: UUID, transaction_id: UUID) -> Transaction | None:
        model = self._session.scalar(
            select(TransactionModel).where(
                TransactionModel.id == str(transaction_id),
                TransactionModel.user_id == str(user_id),
                TransactionModel.deleted_at.is_(None),
            )
        )
        return to_transaction(model) if model else None

    def update_transaction(self, transaction: Transaction) -> Transaction:
        model = self._session.get(TransactionModel, str(transaction.id))
        if model is None or model.deleted_at is not None:
            raise ValueError("Transaction not found.")
        model.category_id = str(transaction.category_id)
        model.transaction_date = transaction.transaction_date
        model.shop_name = transaction.shop_name
        model.card_user_name = transaction.card_user_name
        model.amount = transaction.amount.amount
        model.transaction_type = transaction.transaction_type.value
        model.payment_method = transaction.payment_method
        model.memo = transaction.memo
        model.updated_at = datetime.now(UTC)
        self._session.commit()
        self._session.refresh(model)
        return to_transaction(model)

    def count_other_transactions_by_shop(self, *, user_id: UUID, transaction_id: UUID, shop_name: str) -> int:
        count = self._session.scalar(
            select(func.count())
            .select_from(TransactionModel)
            .where(
                TransactionModel.user_id == str(user_id),
                TransactionModel.id != str(transaction_id),
                TransactionModel.shop_name == shop_name,
                TransactionModel.deleted_at.is_(None),
            )
        )
        return count or 0

    def update_category_for_shop(
        self,
        *,
        user_id: UUID,
        shop_name: str,
        category_id: UUID,
        excluding_transaction_id: UUID,
    ) -> int:
        rows = self._session.scalars(
            select(TransactionModel).where(
                TransactionModel.user_id == str(user_id),
                TransactionModel.id != str(excluding_transaction_id),
                TransactionModel.shop_name == shop_name,
                TransactionModel.deleted_at.is_(None),
            )
        ).all()
        now = datetime.now(UTC)
        for row in rows:
            row.category_id = str(category_id)
            row.updated_at = now
        self._session.commit()
        return len(rows)

    def soft_delete_transaction(self, *, user_id: UUID, transaction_id: UUID) -> None:
        model = self._session.scalar(
            select(TransactionModel).where(
                TransactionModel.id == str(transaction_id),
                TransactionModel.user_id == str(user_id),
                TransactionModel.deleted_at.is_(None),
            )
        )
        if model is None:
            return
        model.deleted_at = datetime.now(UTC)
        model.updated_at = model.deleted_at
        self._session.commit()
