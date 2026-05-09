"""add transaction category rules

Revision ID: 20260508_0008
Revises: 20260508_0007
Create Date: 2026-05-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260508_0008"
down_revision: str | None = "20260508_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "transaction_category_rules",
        sa.Column("id", sa.CHAR(36), nullable=False),
        sa.Column("user_id", sa.CHAR(36), nullable=False),
        sa.Column("keyword", sa.String(255), nullable=False),
        sa.Column("category_id", sa.CHAR(36), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_transaction_category_rules_category_id", "transaction_category_rules", ["category_id"])
    op.create_index("ix_transaction_category_rules_user_id", "transaction_category_rules", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_transaction_category_rules_user_id", table_name="transaction_category_rules")
    op.drop_index("ix_transaction_category_rules_category_id", table_name="transaction_category_rules")
    op.drop_table("transaction_category_rules")
