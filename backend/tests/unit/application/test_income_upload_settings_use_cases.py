from __future__ import annotations

from datetime import UTC, date, datetime
from uuid import UUID, uuid4

import pytest

from app.application.importing.pdf_importer import ImportedCardTransaction
from app.application.importing.upload_import import PdfUploadError, PdfUploadUseCases
from app.application.income_settings import IncomeOverrideCommand, IncomeSettingCommand, IncomeSettingsUseCases
from app.application.income_settings.models import IncomeSetting, IncomeSettingsError
from app.application.settings import SettingsUseCases, UpdateSettingsCommand
from app.application.settings.ports import UserSettingsRecord
from app.domain.entities import Category, Transaction, Upload, UploadStatus
from app.domain.value_objects import MoneyJPY


USER_ID = UUID("11111111-1111-1111-1111-111111111111")
CATEGORY_ID = UUID("22222222-2222-2222-2222-222222222222")
SETTING_ID = UUID("33333333-3333-3333-3333-333333333333")


class FakeIncomeRepository:
    def __init__(self) -> None:
        self.settings: dict[UUID, IncomeSetting] = {}
        self.deleted: list[UUID] = []
        self.overrides: list[IncomeOverrideCommand] = []

    def list_settings(self, *, user_id: UUID) -> list[IncomeSetting]:
        return [setting for setting in self.settings.values() if setting.user_id == user_id]

    def get_setting(self, *, user_id: UUID, income_setting_id: UUID) -> IncomeSetting | None:
        setting = self.settings.get(income_setting_id)
        return setting if setting and setting.user_id == user_id else None

    def create_setting(self, *, user_id: UUID, command: IncomeSettingCommand) -> IncomeSetting:
        setting = IncomeSetting(
            income_setting_id=SETTING_ID,
            user_id=user_id,
            member_name=command.member_name,
            category_id=command.category_id,
            base_amount=command.base_amount,
            base_day=command.base_day,
            start_month=command.start_month,
            end_month=command.end_month,
            overrides=[],
        )
        self.settings[setting.income_setting_id] = setting
        return setting

    def update_setting(self, *, user_id: UUID, income_setting_id: UUID, command: IncomeSettingCommand) -> IncomeSetting:
        setting = IncomeSetting(
            income_setting_id=income_setting_id,
            user_id=user_id,
            member_name=command.member_name,
            category_id=command.category_id,
            base_amount=command.base_amount,
            base_day=command.base_day,
            start_month=command.start_month,
            end_month=command.end_month,
            overrides=[],
        )
        self.settings[income_setting_id] = setting
        return setting

    def delete_setting(self, *, user_id: UUID, income_setting_id: UUID) -> None:
        self.deleted.append(income_setting_id)
        self.settings.pop(income_setting_id, None)

    def upsert_override(self, *, user_id: UUID, income_setting_id: UUID, command: IncomeOverrideCommand) -> None:
        self.overrides.append(command)

    def delete_override(self, *, user_id: UUID, income_setting_id: UUID, target_month: date) -> None:
        self.overrides = [override for override in self.overrides if override.target_month != target_month]


class FakeIncomeTransactionRepository:
    def __init__(self) -> None:
        self.transactions: list[Transaction] = []
        self.existing_hashes: set[str] = set()

    def next_id(self) -> UUID:
        return uuid4()

    def source_hash_exists(self, *, user_id: UUID, source_hash: str) -> bool:
        return source_hash in self.existing_hashes

    def create_transaction(self, transaction: Transaction) -> Transaction:
        self.transactions.append(transaction)
        self.existing_hashes.add(transaction.source_hash or "")
        return transaction


class FakeCategoryRepository:
    def __init__(self, *, active: bool = True) -> None:
        self.category = Category(id=CATEGORY_ID, user_id=USER_ID, name="収入", color="#10B981", is_active=active)

    def get_category(self, *, user_id: UUID, category_id: UUID) -> Category | None:
        if user_id == USER_ID and category_id == CATEGORY_ID:
            return self.category
        return None


def make_income_command(**overrides: object) -> IncomeSettingCommand:
    values = {
        "member_name": "本人",
        "category_id": CATEGORY_ID,
        "base_amount": 250000,
        "base_day": 25,
        "start_month": date(2026, 4, 1),
        "end_month": None,
    }
    values.update(overrides)
    return IncomeSettingCommand(**values)


def make_income_use_cases(
    repository: FakeIncomeRepository | None = None,
    transactions: FakeIncomeTransactionRepository | None = None,
    categories: FakeCategoryRepository | None = None,
) -> IncomeSettingsUseCases:
    return IncomeSettingsUseCases(
        repository or FakeIncomeRepository(),
        transactions or FakeIncomeTransactionRepository(),
        categories or FakeCategoryRepository(),
    )


def test_income_settings_crud_and_override_normalize_months() -> None:
    repository = FakeIncomeRepository()
    transactions = FakeIncomeTransactionRepository()
    use_cases = make_income_use_cases(repository, transactions)

    setting = use_cases.create_setting(user_id=USER_ID, command=make_income_command())
    listed = use_cases.list_settings(user_id=USER_ID)
    updated = use_cases.update_setting(user_id=USER_ID, income_setting_id=setting.income_setting_id, command=make_income_command(member_name="家族"))
    overridden = use_cases.upsert_override(
        user_id=USER_ID,
        income_setting_id=setting.income_setting_id,
        command=IncomeOverrideCommand(target_month=date(2026, 5, 20), amount=300000, day=31),
    )
    normalized_override_month = repository.overrides[0].target_month
    deleted_override = use_cases.delete_override(user_id=USER_ID, income_setting_id=setting.income_setting_id, target_month=date(2026, 5, 20))
    use_cases.delete_setting(user_id=USER_ID, income_setting_id=setting.income_setting_id)

    assert listed[0].income_setting_id == SETTING_ID
    assert updated.member_name == "家族"
    assert overridden.income_setting_id == SETTING_ID
    assert deleted_override.income_setting_id == SETTING_ID
    assert normalized_override_month == date(2026, 5, 1)
    assert repository.deleted == [SETTING_ID]
    assert transactions.transactions


def test_income_apply_due_transactions_skips_future_and_existing_hash() -> None:
    repository = FakeIncomeRepository()
    transactions = FakeIncomeTransactionRepository()
    use_cases = make_income_use_cases(repository, transactions)
    setting = use_cases.create_setting(user_id=USER_ID, command=make_income_command(start_month=date(2026, 5, 1), base_day=31))
    transactions.transactions.clear()
    transactions.existing_hashes.clear()

    assert use_cases.apply_due_transactions(user_id=USER_ID, today=date(2026, 5, 30)) == 0
    assert use_cases.apply_due_transactions(user_id=USER_ID, today=date(2026, 5, 31)) == 1
    assert use_cases.apply_due_transactions(user_id=USER_ID, today=date(2026, 5, 31)) == 0
    assert transactions.transactions[0].shop_name == f"{setting.member_name} 収入"


@pytest.mark.parametrize(
    ("command", "message"),
    [
        (make_income_command(member_name=" "), "Member name"),
        (make_income_command(base_amount=-1), "Amount"),
        (make_income_command(base_day=0), "Day"),
        (make_income_command(start_month=date(2026, 6, 1), end_month=date(2026, 5, 1)), "End month"),
    ],
)
def test_income_settings_validate_invalid_commands(command: IncomeSettingCommand, message: str) -> None:
    with pytest.raises(IncomeSettingsError, match=message):
        make_income_use_cases().create_setting(user_id=USER_ID, command=command)


def test_income_settings_reject_missing_setting_or_inactive_category() -> None:
    with pytest.raises(IncomeSettingsError, match="not found") as exc_info:
        make_income_use_cases().delete_setting(user_id=USER_ID, income_setting_id=uuid4())
    assert exc_info.value.status_code == 404
    with pytest.raises(IncomeSettingsError, match="inactive"):
        make_income_use_cases(categories=FakeCategoryRepository(active=False)).create_setting(user_id=USER_ID, command=make_income_command())


class FakeSettingsRepository:
    def __init__(self) -> None:
        self.record = UserSettingsRecord(
            user_id=USER_ID,
            currency="JPY",
            timezone="Asia/Tokyo",
            date_format="yyyy/MM/dd",
            page_size=20,
            dark_mode=False,
        )

    def get_or_create_settings(self, *, user_id: UUID) -> UserSettingsRecord:
        return self.record

    def update_settings(
        self,
        *,
        user_id: UUID,
        currency: str,
        timezone: str,
        page_size: int,
        date_format: str,
        dark_mode: bool,
    ) -> UserSettingsRecord:
        self.record = UserSettingsRecord(
            user_id=user_id,
            currency=currency,
            timezone=timezone,
            date_format=date_format,
            page_size=page_size,
            dark_mode=dark_mode,
        )
        return self.record


def test_settings_get_and_update_validate_supported_values() -> None:
    use_cases = SettingsUseCases(FakeSettingsRepository())

    current = use_cases.get_settings(USER_ID)
    updated = use_cases.update_settings(
        user_id=USER_ID,
        command=UpdateSettingsCommand(page_size=50, date_format="yyyy-MM-dd", dark_mode=True),
    )

    assert current.page_size == 20
    assert updated.currency == "JPY"
    assert updated.timezone == "Asia/Tokyo"
    assert updated.dark_mode is True
    with pytest.raises(ValueError, match="page_size"):
        use_cases.update_settings(user_id=USER_ID, command=UpdateSettingsCommand(page_size=30, date_format="yyyy/MM/dd", dark_mode=False))
    with pytest.raises(ValueError, match="date_format"):
        use_cases.update_settings(user_id=USER_ID, command=UpdateSettingsCommand(page_size=20, date_format="MM/dd/yyyy", dark_mode=False))


class FakeUploadRepository:
    def __init__(self) -> None:
        self.uploads: dict[UUID, Upload] = {}
        self.upload_id = UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")

    def next_id(self) -> UUID:
        return self.upload_id

    def create_upload(self, *, upload_id: UUID, user_id: UUID, file_name: str, stored_file_path: str, status: UploadStatus) -> Upload:
        upload = Upload(
            id=upload_id,
            user_id=user_id,
            file_name=file_name,
            stored_file_path=stored_file_path,
            status=status,
            uploaded_at=datetime.now(UTC),
        )
        self.uploads[upload_id] = upload
        return upload

    def mark_completed(self, *, upload_id: UUID, imported_count: int) -> Upload:
        upload = self.uploads[upload_id]
        completed = Upload(
            id=upload.id,
            user_id=upload.user_id,
            file_name=upload.file_name,
            stored_file_path=upload.stored_file_path,
            status=UploadStatus.COMPLETED,
            uploaded_at=upload.uploaded_at,
            imported_count=imported_count,
        )
        self.uploads[upload_id] = completed
        return completed

    def mark_failed(self, *, upload_id: UUID, error_message: str) -> Upload:
        upload = self.uploads[upload_id]
        failed = Upload(
            id=upload.id,
            user_id=upload.user_id,
            file_name=upload.file_name,
            stored_file_path=upload.stored_file_path,
            status=UploadStatus.FAILED,
            uploaded_at=upload.uploaded_at,
            error_message=error_message,
        )
        self.uploads[upload_id] = failed
        return failed

    def list_uploads(self, *, user_id: UUID) -> list[Upload]:
        return [upload for upload in self.uploads.values() if upload.user_id == user_id]

    def get_upload(self, *, user_id: UUID, upload_id: UUID) -> Upload | None:
        upload = self.uploads.get(upload_id)
        return upload if upload and upload.user_id == user_id else None

    def soft_delete_upload(self, *, user_id: UUID, upload_id: UUID) -> Upload | None:
        return self.uploads.pop(upload_id, None)


class FakeUploadStorage:
    def __init__(self) -> None:
        self.deleted: list[str] = []

    def save_original(self, *, user_id: UUID, upload_id: UUID, content: bytes) -> str:
        return f"uploads/{upload_id}.pdf"

    def delete(self, stored_file_path: str) -> None:
        self.deleted.append(stored_file_path)


class FakeUploadParser:
    def __init__(self, *, fail: bool = False) -> None:
        self.fail = fail

    def parse(self, pdf_bytes: bytes) -> list[ImportedCardTransaction]:
        if self.fail:
            raise ValueError("parse failed")
        return [
            ImportedCardTransaction(
                transaction_date=date(2026, 5, 1),
                shop_name="Store",
                card_user_name="本人",
                payment_method="1回払い",
                amount=MoneyJPY(1200),
                source_row_number=1,
                source_page_number=1,
                source_format="rakuten_card_pdf",
                source_hash="hash-1",
            ),
            ImportedCardTransaction(
                transaction_date=date(2026, 5, 2),
                shop_name="Store",
                card_user_name="本人",
                payment_method="1回払い",
                amount=MoneyJPY(800),
                source_row_number=2,
                source_page_number=1,
                source_format="rakuten_card_pdf",
                source_hash="hash-2",
            ),
        ]


class FakeImportedTransactionWriter:
    def __init__(self, existing_hashes: set[str] | None = None) -> None:
        self.existing_hashes = existing_hashes or set()
        self.created: list[object] = []

    def source_hash_exists(self, *, user_id: UUID, source_hash: str) -> bool:
        return source_hash in self.existing_hashes

    def create_imported_transaction(self, *, user_id: UUID, command: object) -> None:
        self.created.append(command)


class FakeUploadAuditRepository:
    def __init__(self) -> None:
        self.logs: list[dict[str, object]] = []

    def create_audit_log(self, **kwargs: object) -> None:
        self.logs.append(kwargs)


def make_upload_use_cases(
    *,
    repository: FakeUploadRepository | None = None,
    storage: FakeUploadStorage | None = None,
    parser: FakeUploadParser | None = None,
    writer: FakeImportedTransactionWriter | None = None,
    audit: FakeUploadAuditRepository | None = None,
    max_upload_size_mb: int = 1,
) -> PdfUploadUseCases:
    return PdfUploadUseCases(
        upload_repository=repository or FakeUploadRepository(),
        audit_log_repository=audit or FakeUploadAuditRepository(),
        transaction_writer=writer or FakeImportedTransactionWriter(),
        parser=parser or FakeUploadParser(),
        storage=storage or FakeUploadStorage(),
        max_upload_size_mb=max_upload_size_mb,
    )


def test_pdf_upload_imports_new_rows_and_skips_existing_hashes() -> None:
    repository = FakeUploadRepository()
    writer = FakeImportedTransactionWriter(existing_hashes={"hash-2"})
    use_cases = make_upload_use_cases(repository=repository, writer=writer)

    upload = use_cases.import_pdf(user_id=USER_ID, file_name="statement.PDF", content=b"%PDF")

    assert upload.status == UploadStatus.COMPLETED
    assert upload.imported_count == 1
    assert len(writer.created) == 1
    assert use_cases.list_uploads(user_id=USER_ID) == [upload]
    assert use_cases.get_upload(user_id=USER_ID, upload_id=upload.id) == upload


def test_pdf_upload_records_failed_history_and_audit_log() -> None:
    repository = FakeUploadRepository()
    audit = FakeUploadAuditRepository()
    use_cases = make_upload_use_cases(repository=repository, parser=FakeUploadParser(fail=True), audit=audit)

    upload = use_cases.import_pdf(user_id=USER_ID, file_name="statement.pdf", content=b"%PDF")

    assert upload.status == UploadStatus.FAILED
    assert upload.error_message == "parse failed"
    assert audit.logs[0]["action"] == "upload.failed"


def test_pdf_upload_delete_removes_storage_and_missing_uploads_raise() -> None:
    repository = FakeUploadRepository()
    storage = FakeUploadStorage()
    use_cases = make_upload_use_cases(repository=repository, storage=storage)
    upload = use_cases.import_pdf(user_id=USER_ID, file_name="statement.pdf", content=b"%PDF")

    use_cases.delete_upload(user_id=USER_ID, upload_id=upload.id)

    assert storage.deleted == [f"uploads/{upload.id}.pdf"]
    with pytest.raises(PdfUploadError, match="not found") as get_exc:
        use_cases.get_upload(user_id=USER_ID, upload_id=upload.id)
    with pytest.raises(PdfUploadError, match="not found") as delete_exc:
        use_cases.delete_upload(user_id=USER_ID, upload_id=uuid4())
    assert get_exc.value.status_code == 404
    assert delete_exc.value.status_code == 404


@pytest.mark.parametrize(
    ("file_name", "content", "max_mb", "message"),
    [
        ("statement.txt", b"content", 1, "Only PDF"),
        ("statement.pdf", b"", 1, "empty"),
        ("statement.pdf", b"12345", 0, "size"),
    ],
)
def test_pdf_upload_validates_file_name_size_and_content(file_name: str, content: bytes, max_mb: int, message: str) -> None:
    with pytest.raises(PdfUploadError, match=message):
        make_upload_use_cases(max_upload_size_mb=max_mb).import_pdf(user_id=USER_ID, file_name=file_name, content=content)
