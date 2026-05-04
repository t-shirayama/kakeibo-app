import pytest

from app.domain.value_objects import MoneyJPY


def test_money_jpy_allows_negative_and_zero_amounts() -> None:
    assert MoneyJPY(-1000).amount == -1000
    assert MoneyJPY(0).amount == 0


def test_money_jpy_requires_integer_amount() -> None:
    with pytest.raises(TypeError):
        MoneyJPY(100.5)  # type: ignore[arg-type]


def test_money_jpy_adds_amounts() -> None:
    assert (MoneyJPY(1200) + MoneyJPY(-200)).amount == 1000

