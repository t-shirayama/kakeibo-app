from __future__ import annotations

from uuid import UUID, uuid4

import pytest

from app.application.category_rules import CategoryRuleCommand, CategoryRuleError, CategoryRuleUseCases
from app.domain.entities import Category, TransactionCategoryRule


USER_ID = UUID("11111111-1111-1111-1111-111111111111")
OTHER_USER_ID = UUID("99999999-9999-9999-9999-999999999999")
FOOD_ID = UUID("22222222-2222-2222-2222-222222222222")
DAILY_ID = UUID("33333333-3333-3333-3333-333333333333")


class FakeCategoryRuleRepository:
    def __init__(self) -> None:
        self.rules: dict[UUID, TransactionCategoryRule] = {}

    def next_id(self) -> UUID:
        return uuid4()

    def list_rules(self, *, user_id: UUID, include_inactive: bool = False) -> list[TransactionCategoryRule]:
        return [
            rule
            for rule in self.rules.values()
            if rule.user_id == user_id and (include_inactive or rule.is_active)
        ]

    def get_rule(self, *, user_id: UUID, rule_id: UUID) -> TransactionCategoryRule | None:
        rule = self.rules.get(rule_id)
        return rule if rule and rule.user_id == user_id else None

    def keyword_exists(self, *, user_id: UUID, keyword: str, excluding_rule_id: UUID | None = None) -> bool:
        return any(
            rule.user_id == user_id
            and rule.id != excluding_rule_id
            and rule.keyword.casefold() == keyword.casefold()
            for rule in self.rules.values()
        )

    def create_rule(self, rule: TransactionCategoryRule) -> TransactionCategoryRule:
        self.rules[rule.id] = rule
        return rule

    def update_rule(self, rule: TransactionCategoryRule) -> TransactionCategoryRule:
        self.rules[rule.id] = rule
        return rule

    def set_rule_active(self, *, user_id: UUID, rule_id: UUID, is_active: bool) -> TransactionCategoryRule:
        rule = self.rules[rule_id]
        updated = TransactionCategoryRule(
            id=rule.id,
            user_id=rule.user_id,
            keyword=rule.keyword,
            category_id=rule.category_id,
            is_active=is_active,
        )
        self.rules[rule_id] = updated
        return updated

    def soft_delete_rule(self, *, user_id: UUID, rule_id: UUID) -> None:
        self.rules.pop(rule_id, None)

    def find_matching_category_id(self, *, user_id: UUID, shop_name: str) -> UUID | None:
        return None


class FakeCategoryRepository:
    def __init__(self) -> None:
        self.categories = {
            FOOD_ID: Category(id=FOOD_ID, user_id=USER_ID, name="食費", color="#EF4444"),
            DAILY_ID: Category(id=DAILY_ID, user_id=USER_ID, name="日用品", color="#8B5CF6"),
        }

    def get_category(self, *, user_id: UUID, category_id: UUID) -> Category | None:
        category = self.categories.get(category_id)
        return category if category and category.user_id == user_id else None


def make_use_cases() -> tuple[CategoryRuleUseCases, FakeCategoryRuleRepository, FakeCategoryRepository]:
    rule_repository = FakeCategoryRuleRepository()
    category_repository = FakeCategoryRepository()
    return (
        CategoryRuleUseCases(rule_repository=rule_repository, category_repository=category_repository),
        rule_repository,
        category_repository,
    )


def test_create_update_status_and_delete_category_rule() -> None:
    use_cases, _rule_repository, _category_repository = make_use_cases()

    created = use_cases.create_rule(
        user_id=USER_ID,
        command=CategoryRuleCommand(keyword=" Amazon ", category_id=FOOD_ID),
    )
    updated = use_cases.update_rule(
        user_id=USER_ID,
        rule_id=created.id,
        command=CategoryRuleCommand(keyword="Amazon.co.jp", category_id=DAILY_ID),
    )
    disabled = use_cases.set_rule_active(user_id=USER_ID, rule_id=created.id, is_active=False)
    listed = use_cases.list_rules(user_id=USER_ID, include_inactive=True)
    use_cases.delete_rule(user_id=USER_ID, rule_id=created.id)

    assert created.keyword == "Amazon"
    assert updated.category_id == DAILY_ID
    assert disabled.is_active is False
    assert listed == [disabled]
    assert use_cases.list_rules(user_id=USER_ID, include_inactive=True) == []


def test_category_rule_rejects_duplicate_keyword_and_inactive_category() -> None:
    use_cases, _rule_repository, category_repository = make_use_cases()
    use_cases.create_rule(user_id=USER_ID, command=CategoryRuleCommand(keyword="Amazon", category_id=FOOD_ID))

    with pytest.raises(CategoryRuleError, match="already exists"):
        use_cases.create_rule(user_id=USER_ID, command=CategoryRuleCommand(keyword="amazon", category_id=DAILY_ID))

    category_repository.categories[DAILY_ID] = Category(
        id=DAILY_ID,
        user_id=USER_ID,
        name="日用品",
        color="#8B5CF6",
        is_active=False,
    )
    with pytest.raises(CategoryRuleError, match="inactive"):
        use_cases.create_rule(user_id=USER_ID, command=CategoryRuleCommand(keyword="Drug", category_id=DAILY_ID))


def test_category_rule_is_scoped_to_user_and_validates_missing_rule() -> None:
    use_cases, _rule_repository, _category_repository = make_use_cases()
    created = use_cases.create_rule(user_id=USER_ID, command=CategoryRuleCommand(keyword="Cafe", category_id=FOOD_ID))

    assert use_cases.list_rules(user_id=OTHER_USER_ID, include_inactive=True) == []
    with pytest.raises(CategoryRuleError, match="not found"):
        use_cases.update_rule(
            user_id=OTHER_USER_ID,
            rule_id=created.id,
            command=CategoryRuleCommand(keyword="Cafe", category_id=FOOD_ID),
        )
