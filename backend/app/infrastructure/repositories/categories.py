from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain.entities import Category
from app.infrastructure.models.category import CategoryModel
from app.infrastructure.repositories.mappers import to_category


class CategoryRepository:
    # カテゴリ集約の保存と取得に責務を絞り、明細一覧ルールは持ち込まない。
    def __init__(self, session: Session) -> None:
        self._session = session

    def next_id(self) -> UUID:
        return uuid4()

    def list_categories(self, *, user_id: UUID, include_inactive: bool = False) -> list[Category]:
        filters = [CategoryModel.user_id == str(user_id), CategoryModel.deleted_at.is_(None)]
        if not include_inactive:
            filters.append(CategoryModel.is_active.is_(True))
        rows = self._session.scalars(select(CategoryModel).where(*filters).order_by(CategoryModel.name.asc())).all()
        return [to_category(row) for row in rows]

    def get_category(self, *, user_id: UUID, category_id: UUID) -> Category | None:
        model = self._session.scalar(
            select(CategoryModel).where(
                CategoryModel.id == str(category_id),
                CategoryModel.user_id == str(user_id),
                CategoryModel.deleted_at.is_(None),
            )
        )
        return to_category(model) if model else None

    def category_name_exists(self, *, user_id: UUID, name: str) -> bool:
        count = self._session.scalar(
            select(func.count())
            .select_from(CategoryModel)
            .where(
                CategoryModel.user_id == str(user_id),
                func.lower(CategoryModel.name) == name.casefold(),
                CategoryModel.deleted_at.is_(None),
            )
        )
        return bool(count)

    def create_category(self, category: Category) -> Category:
        restored = self._session.scalar(
            select(CategoryModel).where(
                CategoryModel.user_id == str(category.user_id),
                func.lower(CategoryModel.name) == category.name.casefold(),
                CategoryModel.deleted_at.is_not(None),
            )
        )
        if restored is not None:
            restored.name = category.name
            restored.color = category.color
            restored.description = category.description
            restored.monthly_budget = category.monthly_budget.amount if category.monthly_budget else None
            restored.is_active = category.is_active
            restored.deleted_at = None
            restored.updated_at = datetime.now(UTC)
            self._session.commit()
            self._session.refresh(restored)
            return to_category(restored)

        model = CategoryModel(
            id=str(category.id),
            user_id=str(category.user_id),
            name=category.name,
            color=category.color,
            description=category.description,
            monthly_budget=category.monthly_budget.amount if category.monthly_budget else None,
            is_active=category.is_active,
        )
        self._session.add(model)
        self._session.commit()
        self._session.refresh(model)
        return to_category(model)

    def update_category(self, category: Category) -> Category:
        model = self._session.get(CategoryModel, str(category.id))
        if model is None or model.deleted_at is not None:
            raise ValueError("Category not found.")
        model.name = category.name
        model.color = category.color
        model.description = category.description
        model.monthly_budget = category.monthly_budget.amount if category.monthly_budget else None
        model.is_active = category.is_active
        model.updated_at = datetime.now(UTC)
        self._session.commit()
        self._session.refresh(model)
        return to_category(model)

    def set_category_active(self, *, user_id: UUID, category_id: UUID, is_active: bool) -> Category:
        model = self._session.scalar(
            select(CategoryModel).where(
                CategoryModel.id == str(category_id),
                CategoryModel.user_id == str(user_id),
                CategoryModel.deleted_at.is_(None),
            )
        )
        if model is None:
            raise ValueError("Category not found.")
        model.is_active = is_active
        model.updated_at = datetime.now(UTC)
        self._session.commit()
        self._session.refresh(model)
        return to_category(model)

    def deactivate_category(self, *, user_id: UUID, category_id: UUID) -> None:
        model = self._session.scalar(
            select(CategoryModel).where(
                CategoryModel.id == str(category_id),
                CategoryModel.user_id == str(user_id),
                CategoryModel.deleted_at.is_(None),
            )
        )
        if model is None:
            return
        model.is_active = False
        model.deleted_at = datetime.now(UTC)
        model.updated_at = model.deleted_at
        self._session.commit()

    def get_uncategorized_category_id(self, user_id: UUID) -> UUID | None:
        model = self._session.scalar(
            select(CategoryModel).where(
                CategoryModel.user_id == str(user_id),
                CategoryModel.name == "未分類",
                CategoryModel.deleted_at.is_(None),
            )
        )
        return UUID(model.id) if model else None

    def create_uncategorized_category(self, user_id: UUID) -> UUID:
        category = self.create_category(
            Category(
                id=self.next_id(),
                user_id=user_id,
                name="未分類",
                color="#6B7280",
                description="取込直後や分類未確定の明細",
            )
        )
        return category.id
