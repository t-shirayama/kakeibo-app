from datetime import date, datetime
from uuid import uuid4

from sqlalchemy import CHAR, BigInteger, Date, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base, SoftDeleteMixin, TimestampMixin


class TransactionModel(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "transactions"
    __table_args__ = (
        Index("ix_transactions_user_date", "user_id", "transaction_date"),
        Index("ix_transactions_source_hash", "user_id", "source_hash"),
    )

    id: Mapped[str] = mapped_column(CHAR(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("users.id"), nullable=False, index=True)
    category_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("categories.id"), nullable=False, index=True)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    shop_name: Mapped[str] = mapped_column(String(255), nullable=False)
    card_user_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    transaction_type: Mapped[str] = mapped_column(String(20), nullable=False)
    payment_method: Mapped[str | None] = mapped_column(String(100), nullable=True)
    memo: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    source_upload_id: Mapped[str | None] = mapped_column(CHAR(36), ForeignKey("uploads.id"), nullable=True)
    source_file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_row_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source_page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source_format: Mapped[str | None] = mapped_column(String(50), nullable=True)
    source_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
