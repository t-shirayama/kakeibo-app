from __future__ import annotations

from datetime import date
from uuid import UUID

from app.application.importing.transaction_writer import ImportedTransactionWriter
from app.application.transactions import TransactionCommand
from app.domain.entities import TransactionType


USER_ID = UUID("11111111-1111-1111-1111-111111111111")


class FakeTransactionRepository:
    def __init__(self) -> None:
        self.existing_hashes = {"existing"}

    def source_hash_exists(self, *, user_id: UUID, source_hash: str) -> bool:
        return source_hash in self.existing_hashes


class FakeTransactionUseCases:
    def __init__(self) -> None:
        self.created: list[TransactionCommand] = []

    def create_transaction(self, *, user_id: UUID, command: TransactionCommand) -> None:
        self.created.append(command)


def test_imported_transaction_writer_delegates_duplicate_check_and_creation() -> None:
    repository = FakeTransactionRepository()
    transactions = FakeTransactionUseCases()
    writer = ImportedTransactionWriter(transaction_repository=repository, transactions=transactions)
    command = TransactionCommand(
        transaction_date=date(2026, 5, 1),
        shop_name="Store",
        amount=1200,
        transaction_type=TransactionType.EXPENSE,
    )

    assert writer.source_hash_exists(user_id=USER_ID, source_hash="existing") is True
    writer.create_imported_transaction(user_id=USER_ID, command=command)

    assert transactions.created == [command]
