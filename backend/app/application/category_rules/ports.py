from __future__ import annotations

from typing import Protocol
from uuid import UUID

from app.domain.entities import TransactionCategoryRule


class CategoryRuleRepositoryProtocol(Protocol):
    def next_id(self) -> UUID:
        raise NotImplementedError

    def list_rules(self, *, user_id: UUID, include_inactive: bool = False) -> list[TransactionCategoryRule]:
        raise NotImplementedError

    def get_rule(self, *, user_id: UUID, rule_id: UUID) -> TransactionCategoryRule | None:
        raise NotImplementedError

    def keyword_exists(self, *, user_id: UUID, keyword: str, excluding_rule_id: UUID | None = None) -> bool:
        raise NotImplementedError

    def create_rule(self, rule: TransactionCategoryRule) -> TransactionCategoryRule:
        raise NotImplementedError

    def update_rule(self, rule: TransactionCategoryRule) -> TransactionCategoryRule:
        raise NotImplementedError

    def set_rule_active(self, *, user_id: UUID, rule_id: UUID, is_active: bool) -> TransactionCategoryRule:
        raise NotImplementedError

    def soft_delete_rule(self, *, user_id: UUID, rule_id: UUID) -> None:
        raise NotImplementedError

    def find_matching_category_id(self, *, user_id: UUID, shop_name: str) -> UUID | None:
        raise NotImplementedError
