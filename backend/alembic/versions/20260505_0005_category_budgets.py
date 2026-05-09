"""add monthly budgets to categories

Revision ID: 20260505_0005
Revises: 20260502_0004
Create Date: 2026-05-05
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260505_0005"
down_revision: str | None = "20260502_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    if not _has_monthly_budget_column():
        op.add_column("categories", sa.Column("monthly_budget", sa.Integer(), nullable=True))


def downgrade() -> None:
    if _has_monthly_budget_column():
        op.drop_column("categories", "monthly_budget")


def _has_monthly_budget_column() -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(column["name"] == "monthly_budget" for column in inspector.get_columns("categories"))
