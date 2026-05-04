from datetime import datetime

from sqlalchemy import CHAR, Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base, utc_now


class UserSettingModel(Base):
    __tablename__ = "user_settings"

    user_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("users.id"), primary_key=True)
    currency: Mapped[str] = mapped_column(String(3), default="JPY", nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Tokyo", nullable=False)
    date_format: Mapped[str] = mapped_column(String(20), default="yyyy/MM/dd", nullable=False)
    page_size: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    dark_mode: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )
