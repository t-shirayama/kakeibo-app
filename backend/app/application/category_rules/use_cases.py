from __future__ import annotations

from uuid import UUID

from app.application.category_rules.commands import CategoryRuleCommand
from app.application.category_rules.ports import CategoryRuleRepositoryProtocol
from app.application.errors import ApplicationError
from app.application.transactions.ports import CategoryRepositoryProtocol
from app.domain.entities import TransactionCategoryRule


class CategoryRuleError(ApplicationError):
    pass


class CategoryRuleUseCases:
    def __init__(
        self,
        *,
        rule_repository: CategoryRuleRepositoryProtocol,
        category_repository: CategoryRepositoryProtocol,
    ) -> None:
        self._rule_repository = rule_repository
        self._category_repository = category_repository

    def list_rules(self, *, user_id: UUID, include_inactive: bool = False) -> list[TransactionCategoryRule]:
        return self._rule_repository.list_rules(user_id=user_id, include_inactive=include_inactive)

    def create_rule(self, *, user_id: UUID, command: CategoryRuleCommand) -> TransactionCategoryRule:
        keyword = self._normalize_keyword(command.keyword)
        self._ensure_keyword_unique(user_id=user_id, keyword=keyword)
        self._ensure_category_available(user_id=user_id, category_id=command.category_id)
        return self._rule_repository.create_rule(
            TransactionCategoryRule(
                id=self._rule_repository.next_id(),
                user_id=user_id,
                keyword=keyword,
                category_id=command.category_id,
            )
        )

    def update_rule(self, *, user_id: UUID, rule_id: UUID, command: CategoryRuleCommand) -> TransactionCategoryRule:
        existing = self._get_rule_or_raise(user_id=user_id, rule_id=rule_id)
        keyword = self._normalize_keyword(command.keyword)
        self._ensure_keyword_unique(user_id=user_id, keyword=keyword, excluding_rule_id=rule_id)
        self._ensure_category_available(user_id=user_id, category_id=command.category_id)
        return self._rule_repository.update_rule(
            TransactionCategoryRule(
                id=existing.id,
                user_id=existing.user_id,
                keyword=keyword,
                category_id=command.category_id,
                is_active=existing.is_active,
            )
        )

    def set_rule_active(self, *, user_id: UUID, rule_id: UUID, is_active: bool) -> TransactionCategoryRule:
        self._get_rule_or_raise(user_id=user_id, rule_id=rule_id)
        return self._rule_repository.set_rule_active(user_id=user_id, rule_id=rule_id, is_active=is_active)

    def delete_rule(self, *, user_id: UUID, rule_id: UUID) -> None:
        self._get_rule_or_raise(user_id=user_id, rule_id=rule_id)
        self._rule_repository.soft_delete_rule(user_id=user_id, rule_id=rule_id)

    def _get_rule_or_raise(self, *, user_id: UUID, rule_id: UUID) -> TransactionCategoryRule:
        rule = self._rule_repository.get_rule(user_id=user_id, rule_id=rule_id)
        if rule is None:
            raise CategoryRuleError.not_found("Category rule not found.")
        return rule

    def _ensure_keyword_unique(self, *, user_id: UUID, keyword: str, excluding_rule_id: UUID | None = None) -> None:
        if self._rule_repository.keyword_exists(
            user_id=user_id,
            keyword=keyword,
            excluding_rule_id=excluding_rule_id,
        ):
            raise CategoryRuleError("Category rule keyword already exists.")

    def _ensure_category_available(self, *, user_id: UUID, category_id: UUID) -> None:
        category = self._category_repository.get_category(user_id=user_id, category_id=category_id)
        if category is None or not category.is_active:
            raise CategoryRuleError("Category not found or inactive.")

    def _normalize_keyword(self, keyword: str) -> str:
        normalized = keyword.strip()
        if not normalized:
            raise CategoryRuleError("Category rule keyword is required.")
        return normalized
