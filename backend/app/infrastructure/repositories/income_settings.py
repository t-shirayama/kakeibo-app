from __future__ import annotations

from datetime import UTC, date, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.application.income_settings import (
    IncomeOverride,
    IncomeOverrideCommand,
    IncomeSetting,
    IncomeSettingCommand,
)
from app.infrastructure.models.income_setting import IncomeSettingModel, IncomeSettingOverrideModel


class IncomeSettingsRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_settings(self, *, user_id: UUID) -> list[IncomeSetting]:
        rows = self._session.scalars(
            select(IncomeSettingModel)
            .where(IncomeSettingModel.user_id == str(user_id), IncomeSettingModel.deleted_at.is_(None))
            .order_by(IncomeSettingModel.member_name.asc(), IncomeSettingModel.created_at.asc())
        ).all()
        return [self._to_setting(row) for row in rows]

    def get_setting(self, *, user_id: UUID, income_setting_id: UUID) -> IncomeSetting | None:
        row = self._session.scalar(
            select(IncomeSettingModel).where(
                IncomeSettingModel.id == str(income_setting_id),
                IncomeSettingModel.user_id == str(user_id),
                IncomeSettingModel.deleted_at.is_(None),
            )
        )
        return self._to_setting(row) if row else None

    def create_setting(self, *, user_id: UUID, command: IncomeSettingCommand) -> IncomeSetting:
        model = IncomeSettingModel(
            user_id=str(user_id),
            member_name=command.member_name,
            category_id=str(command.category_id),
            base_amount=command.base_amount,
            base_day=command.base_day,
        )
        self._session.add(model)
        self._session.commit()
        self._session.refresh(model)
        return self._to_setting(model)

    def update_setting(self, *, user_id: UUID, income_setting_id: UUID, command: IncomeSettingCommand) -> IncomeSetting:
        model = self._get_active_model(user_id=user_id, income_setting_id=income_setting_id)
        model.member_name = command.member_name
        model.category_id = str(command.category_id)
        model.base_amount = command.base_amount
        model.base_day = command.base_day
        model.updated_at = datetime.now(UTC)
        self._session.commit()
        self._session.refresh(model)
        return self._to_setting(model)

    def delete_setting(self, *, user_id: UUID, income_setting_id: UUID) -> None:
        model = self._get_active_model(user_id=user_id, income_setting_id=income_setting_id)
        model.deleted_at = datetime.now(UTC)
        model.updated_at = model.deleted_at
        self._session.commit()

    def upsert_override(self, *, user_id: UUID, income_setting_id: UUID, command: IncomeOverrideCommand) -> None:
        model = self._session.scalar(
            select(IncomeSettingOverrideModel).where(
                IncomeSettingOverrideModel.user_id == str(user_id),
                IncomeSettingOverrideModel.income_setting_id == str(income_setting_id),
                IncomeSettingOverrideModel.target_month == command.target_month,
            )
        )
        if model is None:
            model = IncomeSettingOverrideModel(
                user_id=str(user_id),
                income_setting_id=str(income_setting_id),
                target_month=command.target_month,
                amount=command.amount,
                day=command.day,
            )
            self._session.add(model)
        else:
            model.amount = command.amount
            model.day = command.day
            model.updated_at = datetime.now(UTC)
        self._session.commit()

    def delete_override(self, *, user_id: UUID, income_setting_id: UUID, target_month: date) -> None:
        model = self._session.scalar(
            select(IncomeSettingOverrideModel).where(
                IncomeSettingOverrideModel.user_id == str(user_id),
                IncomeSettingOverrideModel.income_setting_id == str(income_setting_id),
                IncomeSettingOverrideModel.target_month == target_month,
            )
        )
        if model is not None:
            self._session.delete(model)
            self._session.commit()

    def _get_active_model(self, *, user_id: UUID, income_setting_id: UUID) -> IncomeSettingModel:
        model = self._session.scalar(
            select(IncomeSettingModel).where(
                IncomeSettingModel.id == str(income_setting_id),
                IncomeSettingModel.user_id == str(user_id),
                IncomeSettingModel.deleted_at.is_(None),
            )
        )
        if model is None:
            raise ValueError("Income setting not found.")
        return model

    def _to_setting(self, model: IncomeSettingModel) -> IncomeSetting:
        override_rows = self._session.scalars(
            select(IncomeSettingOverrideModel)
            .where(
                IncomeSettingOverrideModel.user_id == model.user_id,
                IncomeSettingOverrideModel.income_setting_id == model.id,
            )
            .order_by(IncomeSettingOverrideModel.target_month.desc())
        ).all()
        return IncomeSetting(
            income_setting_id=UUID(model.id),
            user_id=UUID(model.user_id),
            member_name=model.member_name,
            category_id=UUID(model.category_id),
            base_amount=model.base_amount,
            base_day=model.base_day,
            overrides=[
                IncomeOverride(
                    override_id=UUID(row.id),
                    target_month=row.target_month,
                    amount=row.amount,
                    day=row.day,
                )
                for row in override_rows
            ],
        )
