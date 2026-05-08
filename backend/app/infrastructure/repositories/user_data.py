from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.models.category import CategoryModel
from app.infrastructure.models.income_setting import IncomeSettingModel, IncomeSettingOverrideModel
from app.infrastructure.models.password_reset_token import PasswordResetTokenModel
from app.infrastructure.models.refresh_token import RefreshTokenModel
from app.infrastructure.models.transaction import TransactionModel
from app.infrastructure.models.transaction_category_rule import TransactionCategoryRuleModel
from app.infrastructure.models.upload import UploadModel


class UserDataRepository:
    # ユーザーの業務データ削除だけを担当し、画面設定の保存とは分離する。
    def __init__(self, session: Session) -> None:
        self._session = session

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
        for model_class in (TransactionModel, UploadModel, IncomeSettingModel, TransactionCategoryRuleModel):
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
