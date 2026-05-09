from dataclasses import dataclass
from datetime import UTC, datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

try:
    TOKYO_TZ = ZoneInfo("Asia/Tokyo")
except ZoneInfoNotFoundError:  # pragma: no cover
    TOKYO_TZ = timezone(timedelta(hours=9), "Asia/Tokyo")


@dataclass(frozen=True, slots=True)
class MoneyJPY:
    amount: int

    def __post_init__(self) -> None:
        if not isinstance(self.amount, int):
            raise TypeError("JPY amount must be an integer.")

    def __add__(self, other: "MoneyJPY") -> "MoneyJPY":
        return MoneyJPY(self.amount + other.amount)

    def __neg__(self) -> "MoneyJPY":
        return MoneyJPY(-self.amount)


@dataclass(frozen=True, slots=True)
class UtcDateTime:
    value: datetime

    def __post_init__(self) -> None:
        if self.value.tzinfo is None:
            raise ValueError("UTC datetime must be timezone-aware.")
        utc_value = self.value.astimezone(UTC)
        object.__setattr__(self, "value", utc_value)

    def to_tokyo(self) -> datetime:
        return self.value.astimezone(TOKYO_TZ)
