from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo


APP_TIMEZONE = ZoneInfo("Asia/Tokyo")


def app_today() -> date:
    return datetime.now(APP_TIMEZONE).date()
