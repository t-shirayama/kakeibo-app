"""income setting periods

Revision ID: 20260505_0006
Revises: 20260505_0005
Create Date: 2026-05-05 23:10:00
"""

from __future__ import annotations

from datetime import date

import sqlalchemy as sa
from alembic import op


revision = "20260505_0006"
down_revision = "20260505_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("income_settings", sa.Column("start_month", sa.Date(), nullable=True))
    op.add_column("income_settings", sa.Column("end_month", sa.Date(), nullable=True))
    current_month = date.today().replace(day=1)
    op.execute(
        sa.text("UPDATE income_settings SET start_month = :start_month WHERE start_month IS NULL").bindparams(start_month=current_month)
    )
    op.alter_column("income_settings", "start_month", existing_type=sa.Date(), nullable=False)


def downgrade() -> None:
    op.drop_column("income_settings", "end_month")
    op.drop_column("income_settings", "start_month")
