from __future__ import annotations

from sqlalchemy.orm import Session

from app.application.exporting.transaction_workbook_exporter import TransactionWorkbookExporter
from app.application.importing.upload_import import PdfUploadUseCases
from app.application.income_settings import IncomeSettingsUseCases
from app.application.reports import ReportUseCases
from app.application.transactions import CategoryUseCases, TransactionUseCases
from app.infrastructure.config import get_settings
from app.infrastructure.parsers.rakuten_card_pdf_parser import RakutenCardPdfParser
from app.infrastructure.repositories.income_settings import IncomeSettingsRepository
from app.infrastructure.repositories.transactions import (
    AuditLogRepository,
    CategoryRepository,
    TransactionQueryRepository,
    TransactionRepository,
)
from app.infrastructure.repositories.uploads import UploadRepository
from app.infrastructure.storage import LocalUploadStorage


def build_transaction_use_cases(session: Session) -> TransactionUseCases:
    return TransactionUseCases(
        transaction_repository=TransactionRepository(session),
        transaction_query_repository=TransactionQueryRepository(session),
        category_repository=CategoryRepository(session),
        audit_log_repository=AuditLogRepository(session),
    )


def build_category_use_cases(session: Session) -> CategoryUseCases:
    return CategoryUseCases(category_repository=CategoryRepository(session))


def build_report_use_cases(session: Session) -> ReportUseCases:
    return ReportUseCases(
        TransactionQueryRepository(session),
        TransactionWorkbookExporter(),
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
        transaction_repository=TransactionRepository(session),
        transactions=build_transaction_use_cases(session),
        parser=RakutenCardPdfParser(),
        storage=LocalUploadStorage(settings.upload_storage_root),
        max_upload_size_mb=settings.max_upload_size_mb,
    )
