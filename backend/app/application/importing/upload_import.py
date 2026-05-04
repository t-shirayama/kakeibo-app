from __future__ import annotations

from uuid import UUID

from app.application.importing.pdf_importer import CardStatementParser
from app.application.importing.ports import UploadRepositoryProtocol, UploadStorageProtocol
from app.application.transactions import TransactionCommand, TransactionRepositoryProtocol, TransactionUseCases
from app.domain.entities import TransactionType, Upload, UploadStatus


class PdfUploadError(ValueError):
    pass


class PdfUploadUseCases:
    # PDF保存、抽出、明細登録、履歴更新を一つの取込ユースケースとして扱う。
    def __init__(
        self,
        *,
        upload_repository: UploadRepositoryProtocol,
        transaction_repository: TransactionRepositoryProtocol,
        transactions: TransactionUseCases,
        parser: CardStatementParser,
        storage: UploadStorageProtocol,
        max_upload_size_mb: int,
    ) -> None:
        self._upload_repository = upload_repository
        self._transaction_repository = transaction_repository
        self._transactions = transactions
        self._parser = parser
        self._storage = storage
        self._max_upload_size = max_upload_size_mb * 1024 * 1024

    def import_pdf(self, *, user_id: UUID, file_name: str, content: bytes) -> Upload:
        self._validate_pdf(file_name=file_name, content=content)
        # 原本は解析前に保存し、失敗時もアップロード履歴から原因を追えるようにする。
        upload_id = self._upload_repository.next_id()
        stored_file_path = self._storage.save_original(user_id=user_id, upload_id=upload_id, content=content)
        upload = self._upload_repository.create_upload(
            upload_id=upload_id,
            user_id=user_id,
            file_name=file_name,
            stored_file_path=stored_file_path,
            status=UploadStatus.PROCESSING,
        )

        try:
            imported = self._parser.parse(content)
            imported_count = 0
            for item in imported:
                # 同一PDF行の再取込はsource_hashで重複排除する。
                if self._transaction_repository.source_hash_exists(user_id=user_id, source_hash=item.source_hash):
                    continue
                self._transactions.create_transaction(
                    user_id=user_id,
                    command=TransactionCommand(
                        transaction_date=item.transaction_date,
                        shop_name=item.shop_name,
                        amount=item.amount.amount,
                        transaction_type=TransactionType.EXPENSE,
                        payment_method=item.payment_method,
                        card_user_name=item.card_user_name,
                        source_upload_id=upload_id,
                        source_file_name=file_name,
                        source_row_number=item.source_row_number,
                        source_page_number=item.source_page_number,
                        source_format=item.source_format,
                        source_hash=item.source_hash,
                    ),
                )
                imported_count += 1
            upload = self._upload_repository.mark_completed(upload_id=upload_id, imported_count=imported_count)
        except Exception as exc:
            # 解析や登録に失敗しても例外を画面へ直接漏らさず、履歴と監査ログに残す。
            upload = self._upload_repository.mark_failed(upload_id=upload_id, error_message=str(exc))
            self._upload_repository.create_audit_log(
                user_id=user_id,
                action="upload.failed",
                resource_type="upload",
                resource_id=upload_id,
                details={"file_name": file_name, "error": str(exc)},
            )
        return upload

    def list_uploads(self, *, user_id: UUID) -> list[Upload]:
        return self._upload_repository.list_uploads(user_id=user_id)

    def get_upload(self, *, user_id: UUID, upload_id: UUID) -> Upload:
        upload = self._upload_repository.get_upload(user_id=user_id, upload_id=upload_id)
        if upload is None:
            raise PdfUploadError("Upload not found.")
        return upload

    def delete_upload(self, *, user_id: UUID, upload_id: UUID) -> None:
        upload = self._upload_repository.soft_delete_upload(user_id=user_id, upload_id=upload_id)
        if upload is None:
            raise PdfUploadError("Upload not found.")
        self._storage.delete(upload.stored_file_path)

    def _validate_pdf(self, *, file_name: str, content: bytes) -> None:
        if not file_name.lower().endswith(".pdf"):
            raise PdfUploadError("Only PDF files are supported.")
        if len(content) > self._max_upload_size:
            raise PdfUploadError("PDF file size exceeds the limit.")
        if not content:
            raise PdfUploadError("PDF file is empty.")
