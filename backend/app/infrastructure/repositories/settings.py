from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.application.settings import UserSettingsRecord
from app.infrastructure.models.category import CategoryModel
from app.infrastructure.models.income_setting import IncomeSettingModel, IncomeSettingOverrideModel
from app.infrastructure.models.password_reset_token import PasswordResetTokenModel
from app.infrastructure.models.refresh_token import RefreshTokenModel
from app.infrastructure.models.transaction import TransactionModel
from app.infrastructure.models.upload import UploadModel
from app.infrastructure.models.user_setting import UserSettingModel


class SettingsRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_or_create_settings(self, *, user_id: UUID) -> UserSettingsRecord:
        model = self._session.get(UserSettingModel, str(user_id))
        if model is None:
            model = UserSettingModel(user_id=str(user_id))
            self._session.add(model)
            self._session.commit()
            self._session.refresh(model)
        return self._to_record(model)

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
        model = self._session.get(UserSettingModel, str(user_id))
        if model is None:
            model = UserSettingModel(user_id=str(user_id))
            self._session.add(model)
        model.currency = currency
        model.timezone = timezone
        model.page_size = page_size
        model.date_format = date_format
        model.dark_mode = dark_mode
        model.updated_at = datetime.now(UTC)
        self._session.commit()
        self._session.refresh(model)
        return self._to_record(model)

    def list_active_upload_paths(self, *, user_id: UUID) -> list[str]:
        return list(
            self._session.scalars(
                select(UploadModel.stored_file_path).where(
                    UploadModel.user_id == str(user_id),
                    UploadModel.deleted_at.is_(None),
                )
            ).all()
        )

    def soft_delete_user_data(self, *, user_id: UUID) -> None:
        now = datetime.now(UTC)
        for model_class in (TransactionModel, UploadModel, IncomeSettingModel):
            rows = self._session.scalars(
                select(model_class).where(model_class.user_id == str(user_id), model_class.deleted_at.is_(None))
            ).all()
            for row in rows:
                row.deleted_at = now
                if hasattr(row, "updated_at"):
                    row.updated_at = now

        category_rows = self._session.scalars(
            select(CategoryModel).where(
                CategoryModel.user_id == str(user_id),
                CategoryModel.deleted_at.is_(None),
                CategoryModel.name != "未分類",
            )
        ).all()
        for row in category_rows:
            row.deleted_at = now
            row.updated_at = now

        income_overrides = self._session.scalars(
            select(IncomeSettingOverrideModel).where(IncomeSettingOverrideModel.user_id == str(user_id))
        ).all()
        for override in income_overrides:
            self._session.delete(override)

        refresh_tokens = self._session.scalars(
            select(RefreshTokenModel).where(
                RefreshTokenModel.user_id == str(user_id),
                RefreshTokenModel.revoked_at.is_(None),
            )
        ).all()
        for token in refresh_tokens:
            token.revoked_at = now

        reset_tokens = self._session.scalars(
            select(PasswordResetTokenModel).where(
                PasswordResetTokenModel.user_id == str(user_id),
                PasswordResetTokenModel.used_at.is_(None),
            )
        ).all()
        for token in reset_tokens:
            token.used_at = now

        self._session.commit()

    def _to_record(self, model: UserSettingModel) -> UserSettingsRecord:
        return UserSettingsRecord(
            user_id=UUID(model.user_id),
            currency=model.currency,
            timezone=model.timezone,
            date_format=model.date_format,
            page_size=model.page_size,
            dark_mode=model.dark_mode,
        )
