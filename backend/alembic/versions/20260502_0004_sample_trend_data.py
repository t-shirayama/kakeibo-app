"""reserved sample trend data revision

Revision ID: 20260502_0004
Revises: 20260502_0003
Create Date: 2026-05-02
"""

from collections.abc import Sequence

revision: str = "20260502_0004"
down_revision: str | None = "20260502_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """サンプルデータは明示コマンドで投入するため、migrationでは何もしない。"""


def downgrade() -> None:
    """履歴互換用の空revision。"""
