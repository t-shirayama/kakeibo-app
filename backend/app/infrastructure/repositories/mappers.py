from __future__ import annotations

from uuid import UUID

from app.domain.entities import Category, Transaction, TransactionCategoryRule, TransactionType
from app.domain.value_objects import MoneyJPY
from app.infrastructure.models.category import CategoryModel
from app.infrastructure.models.transaction import TransactionModel
from app.infrastructure.models.transaction_category_rule import TransactionCategoryRuleModel


def to_transaction(model: TransactionModel) -> Transaction:
    return Transaction(
        id=UUID(model.id),
        user_id=UUID(model.user_id),
        category_id=UUID(model.category_id),
        transaction_date=model.transaction_date,
        shop_name=model.shop_name,
        amount=MoneyJPY(model.amount),
        transaction_type=TransactionType(model.transaction_type),
        payment_method=model.payment_method,
        card_user_name=model.card_user_name,
        memo=model.memo,
        source_upload_id=UUID(model.source_upload_id) if model.source_upload_id else None,
        source_file_name=model.source_file_name,
        source_row_number=model.source_row_number,
        source_page_number=model.source_page_number,
        source_format=model.source_format,
        source_hash=model.source_hash,
    )


def to_category(model: CategoryModel) -> Category:
    return Category(
        id=UUID(model.id),
        user_id=UUID(model.user_id),
        name=model.name,
        color=model.color,
        description=model.description,
        monthly_budget=MoneyJPY(model.monthly_budget) if model.monthly_budget is not None else None,
        is_active=model.is_active,
    )


def to_transaction_category_rule(model: TransactionCategoryRuleModel) -> TransactionCategoryRule:
    return TransactionCategoryRule(
        id=UUID(model.id),
        user_id=UUID(model.user_id),
        keyword=model.keyword,
        category_id=UUID(model.category_id),
        is_active=model.is_active,
    )
