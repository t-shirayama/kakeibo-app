from __future__ import annotations

from uuid import UUID

from app.application.transactions.commands import TransactionCommand
from app.application.transactions.ports import CategoryRepositoryProtocol, TransactionQueryRepositoryProtocol


class TransactionCategoryError(ValueError):
    pass


class TransactionCategoryPolicy:
    # 分類候補の補完と有効カテゴリ検証だけを担当し、CRUD本体から業務判断を切り離す。
    def __init__(
        self,
        *,
        transaction_query_repository: TransactionQueryRepositoryProtocol,
        category_repository: CategoryRepositoryProtocol,
    ) -> None:
        self._transaction_query_repository = transaction_query_repository
        self._category_repository = category_repository

    def resolve_category_id_for_new_transaction(self, *, user_id: UUID, command: TransactionCommand) -> UUID:
        category_id = command.category_id or self._transaction_query_repository.find_category_id_for_shop(
            user_id=user_id,
            shop_name=command.shop_name,
            card_user_name=command.card_user_name,
            payment_method=command.payment_method,
        )
        category_id = category_id or self._category_repository.get_uncategorized_category_id(user_id)
        if category_id is None:
            # 初期カテゴリが欠けたデータでも、明細登録を止めずに最低限の分類先を用意する。
            category_id = self._category_repository.create_uncategorized_category(user_id)
        self.ensure_category_available(user_id=user_id, category_id=category_id)
        return category_id

    def ensure_category_available(self, *, user_id: UUID, category_id: UUID) -> None:
        # 無効化カテゴリへ新規・更新明細を紐づけると、未分類扱いの表示ルールと衝突する。
        category = self._category_repository.get_category(user_id=user_id, category_id=category_id)
        if category is None or not category.is_active:
            raise TransactionCategoryError("Category not found or inactive.")
