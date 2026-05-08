"""reserved sample data revision

Revision ID: 20260501_0002
Revises: 20260501_0001
Create Date: 2026-05-01
"""

from collections.abc import Sequence

revision: str = "20260501_0002"
down_revision: str | None = "20260501_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """サンプルデータは明示コマンドで投入するため、migrationでは何もしない。"""


def downgrade() -> None:
    """履歴互換用の空revision。"""
