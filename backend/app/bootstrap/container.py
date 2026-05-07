from __future__ import annotations

from sqlalchemy.orm import Session

from app.application.audit_logs import AuditLogUseCases
from app.application.auth.use_cases import AuthUseCases
from app.application.exporting.transaction_workbook_exporter import TransactionWorkbookExporter
from app.application.importing.upload_import import PdfUploadUseCases
from app.application.importing.transaction_writer import ImportedTransactionWriter
from app.application.income_settings import IncomeSettingsUseCases
from app.application.reports import ReportUseCases
from app.application.settings import SettingsUseCases
from app.application.transactions import CategoryUseCases, TransactionUseCases
from app.application.user_data import UserDataDeletionUseCases
from app.infrastructure.config import get_settings
from app.infrastructure.parsers.rakuten_card_pdf_parser import RakutenCardPdfParser
from app.infrastructure.repositories.audit_log_records import AuditLogRecordRepository
from app.infrastructure.repositories.audit_logs import AuditLogQueryRepository
from app.infrastructure.repositories.auth import AuthRepository
from app.infrastructure.repositories.categories import CategoryRepository
from app.infrastructure.repositories.income_settings import IncomeSettingsRepository
from app.infrastructure.repositories.settings import SettingsRepository
from app.infrastructure.repositories.transaction_queries import TransactionQueryRepository
from app.infrastructure.repositories.transaction_records import TransactionRepository
from app.infrastructure.repositories.uploads import UploadRepository
from app.infrastructure.repositories.user_data import UserDataRepository
from app.infrastructure.security import JwtService, PasswordHasher, TokenHasher
from app.infrastructure.storage import LocalUploadStorage


def build_transaction_use_cases(session: Session) -> TransactionUseCases:
    return TransactionUseCases(
        transaction_repository=TransactionRepository(session),
        transaction_query_repository=TransactionQueryRepository(session),
        category_repository=CategoryRepository(session),
        audit_log_repository=AuditLogRecordRepository(session),
    )


def build_category_use_cases(session: Session) -> CategoryUseCases:
    return CategoryUseCases(category_repository=CategoryRepository(session))


def build_audit_log_use_cases(session: Session) -> AuditLogUseCases:
    return AuditLogUseCases(AuditLogQueryRepository(session))


def build_report_use_cases(session: Session) -> ReportUseCases:
    return ReportUseCases(
        repository=TransactionQueryRepository(session),
        category_repository=CategoryRepository(session),
        workbook_exporter=TransactionWorkbookExporter(),
    )


def build_settings_use_cases(session: Session) -> SettingsUseCases:
    return SettingsUseCases(repository=SettingsRepository(session))


def build_user_data_deletion_use_cases(session: Session) -> UserDataDeletionUseCases:
    settings = get_settings()
    return UserDataDeletionUseCases(
        repository=UserDataRepository(session),
        storage=LocalUploadStorage(settings.upload_storage_root),
        password_hasher=PasswordHasher(),
    )


def build_income_settings_use_cases(session: Session) -> IncomeSettingsUseCases:
    return IncomeSettingsUseCases(
        IncomeSettingsRepository(session),
        TransactionRepository(session),
        CategoryRepository(session),
    )


def build_pdf_upload_use_cases(session: Session) -> PdfUploadUseCases:
    settings = get_settings()
    return PdfUploadUseCases(
        upload_repository=UploadRepository(session),
        audit_log_repository=AuditLogRecordRepository(session),
        transaction_writer=ImportedTransactionWriter(
            transaction_repository=TransactionRepository(session),
            transactions=build_transaction_use_cases(session),
        ),
        parser=RakutenCardPdfParser(),
        storage=LocalUploadStorage(settings.upload_storage_root),
        max_upload_size_mb=settings.max_upload_size_mb,
    )


def build_auth_use_cases(session: Session) -> AuthUseCases:
    settings = get_settings()
    return AuthUseCases(
        repository=AuthRepository(session),
        settings=settings,
        jwt_service=JwtService(settings),
        password_hasher=PasswordHasher(),
        token_hasher=TokenHasher(),
    )
