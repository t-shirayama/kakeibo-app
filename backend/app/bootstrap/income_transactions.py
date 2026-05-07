from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.bootstrap.container import build_income_settings_use_cases


def apply_due_income_transactions(*, user_id: UUID, session: Session) -> int:
    return build_income_settings_use_cases(session).apply_due_transactions(user_id=user_id)
