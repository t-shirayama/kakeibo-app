from uuid import uuid4

from sqlalchemy import CHAR, Boolean, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base, SoftDeleteMixin, TimestampMixin


class TransactionCategoryRuleModel(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "transaction_category_rules"
    __table_args__ = (
        Index("ix_transaction_category_rules_user_id", "user_id"),
        Index("ix_transaction_category_rules_category_id", "category_id"),
    )

    id: Mapped[str] = mapped_column(CHAR(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("users.id"), nullable=False)
    keyword: Mapped[str] = mapped_column(String(255), nullable=False)
    category_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("categories.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
