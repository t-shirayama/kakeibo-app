"""remove auto-seeded sample data

Revision ID: 20260508_0007
Revises: 20260505_0006
Create Date: 2026-05-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260508_0007"
down_revision: str | None = "20260505_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


SAMPLE_USER_ID = "00000000-0000-0000-0000-000000000101"
SAMPLE_EMAIL = "sample@example.com"


def upgrade() -> None:
    user_ids = _sample_user_ids()
    for table_name in (
        "audit_logs",
        "transactions",
        "income_setting_overrides",
        "income_settings",
        "refresh_tokens",
        "password_reset_tokens",
        "user_settings",
        "uploads",
        "categories",
    ):
        op.execute(sa.text(f"DELETE FROM {table_name} WHERE user_id IN ({user_ids})"))
    op.execute(
        sa.text("DELETE FROM users WHERE id = :user_id OR email = :email").bindparams(
            user_id=SAMPLE_USER_ID,
            email=SAMPLE_EMAIL,
        )
    )


def downgrade() -> None:
    """サンプルデータは `python -m app.bootstrap.seed_sample_data` で再投入する。"""


def _sample_user_ids() -> str:
    return (
        "SELECT id FROM users "
        f"WHERE id = '{SAMPLE_USER_ID}' OR email = '{SAMPLE_EMAIL}'"
    )
