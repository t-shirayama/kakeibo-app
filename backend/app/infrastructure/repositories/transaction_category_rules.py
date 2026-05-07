from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.infrastructure.models.category import CategoryModel

UNCATEGORIZED_CATEGORY_NAME = "未分類"
UNCATEGORIZED_CATEGORY_COLOR = "#6B7280"


def unavailable_category_ids_query(user_id: UUID):
    return select(CategoryModel.id).where(
        CategoryModel.user_id == str(user_id),
        CategoryModel.name != UNCATEGORIZED_CATEGORY_NAME,
        or_(CategoryModel.is_active.is_(False), CategoryModel.deleted_at.is_not(None)),
    )


def uncategorized_category_ids_query(user_id: UUID):
    return select(CategoryModel.id).where(
        CategoryModel.user_id == str(user_id),
        CategoryModel.name == UNCATEGORIZED_CATEGORY_NAME,
        CategoryModel.deleted_at.is_(None),
    )


def is_uncategorized_category(*, session: Session, user_id: UUID, category_id: UUID) -> bool:
    count = session.scalar(
        select(func.count())
        .select_from(CategoryModel)
        .where(
            CategoryModel.id == str(category_id),
            CategoryModel.user_id == str(user_id),
            CategoryModel.name == UNCATEGORIZED_CATEGORY_NAME,
            CategoryModel.deleted_at.is_(None),
        )
    )
    return bool(count)
