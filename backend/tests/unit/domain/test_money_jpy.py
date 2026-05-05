from datetime import UTC, datetime

import pytest

from app.domain.value_objects import MoneyJPY, UtcDateTime


def test_money_jpy_allows_negative_and_zero_amounts() -> None:
    assert MoneyJPY(-1000).amount == -1000
    assert MoneyJPY(0).amount == 0


def test_money_jpy_requires_integer_amount() -> None:
    with pytest.raises(TypeError):
        MoneyJPY(100.5)  # type: ignore[arg-type]


def test_money_jpy_adds_amounts() -> None:
    assert (MoneyJPY(1200) + MoneyJPY(-200)).amount == 1000


def test_utc_datetime_requires_timezone_aware_value() -> None:
    with pytest.raises(ValueError, match="timezone-aware"):
        UtcDateTime(datetime(2026, 5, 1, 12, 0, 0))


def test_utc_datetime_normalizes_to_utc_and_can_convert_to_tokyo() -> None:
    value = UtcDateTime(datetime(2026, 5, 1, 12, 0, 0, tzinfo=UTC))

    assert value.value.tzinfo == UTC
    tokyo = value.to_tokyo()
    assert tokyo.hour == 21
    assert tokyo.tzinfo is not None
