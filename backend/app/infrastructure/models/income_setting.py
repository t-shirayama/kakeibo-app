from datetime import date
from uuid import uuid4

from sqlalchemy import CHAR, BigInteger, Date, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base, SoftDeleteMixin, TimestampMixin


class IncomeSettingModel(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "income_settings"
    __table_args__ = (Index("ix_income_settings_user_id", "user_id"),)

    id: Mapped[str] = mapped_column(CHAR(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("users.id"), nullable=False)
    member_name: Mapped[str] = mapped_column(String(100), nullable=False)
    category_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("categories.id"), nullable=False)
    base_amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    base_day: Mapped[int] = mapped_column(Integer, nullable=False)
    start_month: Mapped[date] = mapped_column(Date, nullable=False)
    end_month: Mapped[date | None] = mapped_column(Date, nullable=True)


class IncomeSettingOverrideModel(TimestampMixin, Base):
    __tablename__ = "income_setting_overrides"
    __table_args__ = (
        UniqueConstraint("income_setting_id", "target_month", name="uq_income_setting_overrides_setting_month"),
        Index("ix_income_setting_overrides_user_id", "user_id"),
    )

    id: Mapped[str] = mapped_column(CHAR(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("users.id"), nullable=False)
    income_setting_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("income_settings.id"), nullable=False)
    target_month: Mapped[date] = mapped_column(Date, nullable=False)
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    day: Mapped[int] = mapped_column(Integer, nullable=False)
