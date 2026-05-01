from uuid import uuid4

from sqlalchemy import CHAR, String
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base, SoftDeleteMixin, TimestampMixin


class UserModel(TimestampMixin, SoftDeleteMixin, Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(CHAR(36), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
