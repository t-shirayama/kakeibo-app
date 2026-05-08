from __future__ import annotations

from datetime import UTC, date, datetime
from uuid import UUID, uuid4

import pytest

from app.application.audit_logs import AuditLogEntry, AuditLogUseCases
from app.application.common import Page, PageResult
from app.application.user_data import UserDataDeletionError, UserDataDeletionUseCases
from app.application.auth.ports import UserRecord


USER_ID = UUID("11111111-1111-1111-1111-111111111111")


def test_page_validates_bounds_and_calculates_offset() -> None:
    assert Page(page=3, page_size=20).offset == 40
    with pytest.raises(ValueError, match="page must"):
        Page(page=0, page_size=20)
    with pytest.raises(ValueError, match="page_size"):
        Page(page=1, page_size=0)
    with pytest.raises(ValueError, match="page_size"):
        Page(page=1, page_size=101)


class FakeAuditLogRepository:
    def __init__(self) -> None:
        self.received_filters: dict[str, object] = {}

    def list_audit_logs(
        self,
        *,
        user_id: UUID,
        page: Page,
        action: str | None = None,
        resource_type: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> PageResult[AuditLogEntry]:
        self.received_filters = {
            "action": action,
            "resource_type": resource_type,
            "date_from": date_from,
            "date_to": date_to,
        }
        return PageResult(
            items=[
                AuditLogEntry(
                    audit_log_id=uuid4(),
                    user_id=user_id,
                    user_email="user@example.com",
                    action=action or "transaction.updated",
                    resource_type=resource_type or "transaction",
                    resource_id=str(uuid4()),
                    details={"shop_name": "Store"},
                    created_at=datetime.now(UTC).isoformat(),
                )
            ],
            total=1,
            page=page.page,
            page_size=page.page_size,
        )


def test_audit_log_use_case_delegates_filters() -> None:
    repository = FakeAuditLogRepository()
    use_cases = AuditLogUseCases(repository)

    result = use_cases.list_audit_logs(
        user_id=USER_ID,
        page=Page(page=1, page_size=10),
        action="upload.failed",
        resource_type="upload",
        date_from=date(2026, 5, 1),
        date_to=date(2026, 5, 31),
    )

    assert result.total == 1
    assert repository.received_filters["action"] == "upload.failed"
    assert repository.received_filters["resource_type"] == "upload"


class FakeUserDataRepository:
    def __init__(self) -> None:
        self.deleted = False

    def list_active_upload_paths(self, *, user_id: UUID) -> list[str]:
        return ["storage/uploads/a.pdf", "storage/uploads/b.pdf"]

    def soft_delete_user_data(self, *, user_id: UUID) -> None:
        self.deleted = True


class FakeStorage:
    def __init__(self) -> None:
        self.deleted_paths: list[str] = []

    def delete(self, path: str) -> None:
        self.deleted_paths.append(path)


class FakePasswordHasher:
    def verify(self, password: str, password_hash: str) -> bool:
        return password == "StrongPass123!" and password_hash == "hash"


def test_user_data_deletion_requires_confirmation_or_valid_password() -> None:
    use_cases = UserDataDeletionUseCases(
        repository=FakeUserDataRepository(),
        storage=FakeStorage(),
        password_hasher=FakePasswordHasher(),
    )
    current_user = UserRecord(id=USER_ID, email="user@example.com", password_hash="hash", is_admin=False)

    with pytest.raises(UserDataDeletionError, match="Confirmation"):
        use_cases.delete_all_user_data(current_user=current_user, confirmation_text=None, password="wrong")


def test_user_data_deletion_accepts_confirmation_text_and_deletes_upload_paths() -> None:
    repository = FakeUserDataRepository()
    storage = FakeStorage()
    use_cases = UserDataDeletionUseCases(repository=repository, storage=storage, password_hasher=FakePasswordHasher())

    use_cases.delete_all_user_data(
        current_user=UserRecord(id=USER_ID, email="user@example.com", password_hash="hash", is_admin=False),
        confirmation_text="DELETE",
        password=None,
    )

    assert repository.deleted is True
    assert storage.deleted_paths == ["storage/uploads/a.pdf", "storage/uploads/b.pdf"]
