from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Page:
    page: int
    page_size: int

    def __post_init__(self) -> None:
        if self.page < 1:
            raise ValueError("page must be greater than or equal to 1.")
        if self.page_size < 1 or self.page_size > 100:
            raise ValueError("page_size must be between 1 and 100.")

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


@dataclass(frozen=True, slots=True)
class PageResult[T]:
    items: list[T]
    total: int
    page: int
    page_size: int
