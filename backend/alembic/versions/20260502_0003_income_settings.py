"""income settings

Revision ID: 20260502_0003
Revises: 20260501_0002
Create Date: 2026-05-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260502_0003"
down_revision: str | None = "20260501_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "income_settings",
        sa.Column("id", sa.CHAR(36), nullable=False),
        sa.Column("user_id", sa.CHAR(36), nullable=False),
        sa.Column("member_name", sa.String(100), nullable=False),
        sa.Column("category_id", sa.CHAR(36), nullable=False),
        sa.Column("base_amount", sa.BigInteger(), nullable=False),
        sa.Column("base_day", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_income_settings_user_id", "income_settings", ["user_id"])

    op.create_table(
        "income_setting_overrides",
        sa.Column("id", sa.CHAR(36), nullable=False),
        sa.Column("user_id", sa.CHAR(36), nullable=False),
        sa.Column("income_setting_id", sa.CHAR(36), nullable=False),
        sa.Column("target_month", sa.Date(), nullable=False),
        sa.Column("amount", sa.BigInteger(), nullable=False),
        sa.Column("day", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["income_setting_id"], ["income_settings.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("income_setting_id", "target_month", name="uq_income_setting_overrides_setting_month"),
    )
    op.create_index("ix_income_setting_overrides_user_id", "income_setting_overrides", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_income_setting_overrides_user_id", table_name="income_setting_overrides")
    op.drop_table("income_setting_overrides")
    op.drop_index("ix_income_settings_user_id", table_name="income_settings")
    op.drop_table("income_settings")
