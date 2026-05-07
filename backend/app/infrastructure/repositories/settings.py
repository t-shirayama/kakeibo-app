from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.application.settings import UserSettingsRecord
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

    def _to_record(self, model: UserSettingModel) -> UserSettingsRecord:
        return UserSettingsRecord(
            user_id=UUID(model.user_id),
            currency=model.currency,
            timezone=model.timezone,
            date_format=model.date_format,
            page_size=model.page_size,
            dark_mode=model.dark_mode,
        )
