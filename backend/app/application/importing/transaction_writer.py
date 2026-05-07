from __future__ import annotations

from uuid import UUID

from app.application.transactions import TransactionCommand, TransactionRepositoryProtocol, TransactionUseCases


class ImportedTransactionWriter:
    # PDF取込から見た明細登録境界を一本化し、取込ユースケースが明細側の内部構成を握らないようにする。
    def __init__(
        self,
        *,
        transaction_repository: TransactionRepositoryProtocol,
        transactions: TransactionUseCases,
    ) -> None:
        self._transaction_repository = transaction_repository
        self._transactions = transactions

    def source_hash_exists(self, *, user_id: UUID, source_hash: str) -> bool:
        return self._transaction_repository.source_hash_exists(user_id=user_id, source_hash=source_hash)

    def create_imported_transaction(self, *, user_id: UUID, command: TransactionCommand) -> None:
        self._transactions.create_transaction(user_id=user_id, command=command)
