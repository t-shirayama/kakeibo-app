from collections.abc import Callable
from uuid import UUID, uuid4

from app.domain.entities import Category


DEFAULT_INITIAL_CATEGORIES: tuple[tuple[str, str, str], ...] = (
    ("未分類", "#6B7280", "取込直後や分類未確定の明細"),
    ("食費", "#EF4444", "食料品、外食、日々の食事"),
    ("交通費", "#3B82F6", "電車、バス、タクシーなどの移動費"),
    ("日用品", "#8B5CF6", "生活用品や家庭用品"),
    ("通信費", "#F59E0B", "通信、サブスクリプション、公共料金"),
    ("収入", "#10B981", "給与、返金、その他の収入"),
)


def create_initial_categories(
    user_id: UUID,
    id_factory: Callable[[], UUID] = uuid4,
) -> list[Category]:
    return [
        Category(
            id=id_factory(),
            user_id=user_id,
            name=name,
            color=color,
            description=description,
        )
        for name, color, description in DEFAULT_INITIAL_CATEGORIES
    ]
