from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class UpdateSettingsCommand:
    page_size: int
    date_format: str
    dark_mode: bool
