from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain.entities import TransactionCategoryRule
from app.infrastructure.models.category import CategoryModel
from app.infrastructure.models.transaction_category_rule import TransactionCategoryRuleModel
from app.infrastructure.repositories.mappers import to_transaction_category_rule


class CategoryRuleRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def next_id(self) -> UUID:
        return uuid4()

    def list_rules(self, *, user_id: UUID, include_inactive: bool = False) -> list[TransactionCategoryRule]:
        filters = [
            TransactionCategoryRuleModel.user_id == str(user_id),
            TransactionCategoryRuleModel.deleted_at.is_(None),
        ]
        if not include_inactive:
            filters.append(TransactionCategoryRuleModel.is_active.is_(True))
        rows = self._session.scalars(
            select(TransactionCategoryRuleModel)
            .where(*filters)
            .order_by(TransactionCategoryRuleModel.updated_at.desc(), TransactionCategoryRuleModel.keyword.asc())
        ).all()
        return [to_transaction_category_rule(row) for row in rows]

    def get_rule(self, *, user_id: UUID, rule_id: UUID) -> TransactionCategoryRule | None:
        row = self._session.scalar(
            select(TransactionCategoryRuleModel).where(
                TransactionCategoryRuleModel.id == str(rule_id),
                TransactionCategoryRuleModel.user_id == str(user_id),
                TransactionCategoryRuleModel.deleted_at.is_(None),
            )
        )
        return to_transaction_category_rule(row) if row else None

    def keyword_exists(self, *, user_id: UUID, keyword: str, excluding_rule_id: UUID | None = None) -> bool:
        filters = [
            TransactionCategoryRuleModel.user_id == str(user_id),
            func.lower(TransactionCategoryRuleModel.keyword) == keyword.casefold(),
            TransactionCategoryRuleModel.deleted_at.is_(None),
        ]
        if excluding_rule_id is not None:
            filters.append(TransactionCategoryRuleModel.id != str(excluding_rule_id))
        count = self._session.scalar(select(func.count()).select_from(TransactionCategoryRuleModel).where(*filters))
        return bool(count)

    def create_rule(self, rule: TransactionCategoryRule) -> TransactionCategoryRule:
        model = TransactionCategoryRuleModel(
            id=str(rule.id),
            user_id=str(rule.user_id),
            keyword=rule.keyword,
            category_id=str(rule.category_id),
            is_active=rule.is_active,
        )
        self._session.add(model)
        self._session.commit()
        self._session.refresh(model)
        return to_transaction_category_rule(model)

    def update_rule(self, rule: TransactionCategoryRule) -> TransactionCategoryRule:
        model = self._session.get(TransactionCategoryRuleModel, str(rule.id))
        if model is None or model.deleted_at is not None:
            raise ValueError("Category rule not found.")
        model.keyword = rule.keyword
        model.category_id = str(rule.category_id)
        model.is_active = rule.is_active
        model.updated_at = datetime.now(UTC)
        self._session.commit()
        self._session.refresh(model)
        return to_transaction_category_rule(model)

    def set_rule_active(self, *, user_id: UUID, rule_id: UUID, is_active: bool) -> TransactionCategoryRule:
        model = self._session.scalar(
            select(TransactionCategoryRuleModel).where(
                TransactionCategoryRuleModel.id == str(rule_id),
                TransactionCategoryRuleModel.user_id == str(user_id),
                TransactionCategoryRuleModel.deleted_at.is_(None),
            )
        )
        if model is None:
            raise ValueError("Category rule not found.")
        model.is_active = is_active
        model.updated_at = datetime.now(UTC)
        self._session.commit()
        self._session.refresh(model)
        return to_transaction_category_rule(model)

    def soft_delete_rule(self, *, user_id: UUID, rule_id: UUID) -> None:
        model = self._session.scalar(
            select(TransactionCategoryRuleModel).where(
                TransactionCategoryRuleModel.id == str(rule_id),
                TransactionCategoryRuleModel.user_id == str(user_id),
                TransactionCategoryRuleModel.deleted_at.is_(None),
            )
        )
        if model is None:
            return
        model.deleted_at = datetime.now(UTC)
        model.updated_at = model.deleted_at
        self._session.commit()

    def find_matching_category_id(self, *, user_id: UUID, shop_name: str) -> UUID | None:
        normalized_shop_name = shop_name.strip().casefold()
        if not normalized_shop_name:
            return None
        rows = self._session.execute(
            select(TransactionCategoryRuleModel, CategoryModel)
            .join(CategoryModel, TransactionCategoryRuleModel.category_id == CategoryModel.id)
            .where(
                TransactionCategoryRuleModel.user_id == str(user_id),
                TransactionCategoryRuleModel.is_active.is_(True),
                TransactionCategoryRuleModel.deleted_at.is_(None),
                CategoryModel.user_id == str(user_id),
                CategoryModel.is_active.is_(True),
                CategoryModel.deleted_at.is_(None),
            )
            .order_by(
                func.length(TransactionCategoryRuleModel.keyword).desc(),
                TransactionCategoryRuleModel.updated_at.desc(),
            )
        ).all()
        for rule, category in rows:
            if rule.keyword.strip().casefold() in normalized_shop_name:
                return UUID(category.id)
        return None
