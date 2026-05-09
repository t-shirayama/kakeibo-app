from __future__ import annotations

from zipfile import ZipFile
from io import BytesIO

import pytest

from app.application.exporting.excel_exporter import Worksheet, export_workbook


def test_export_workbook_contains_required_sheets() -> None:
    workbook = export_workbook(
        [
            Worksheet(name="明細一覧", rows=[["店名", "金額"], ["Store", 1200]]),
            Worksheet(name="カテゴリ集計", rows=[["カテゴリ", "金額"], ["食費", 1200]]),
            Worksheet(name="月別集計", rows=[["月", "金額"], ["2026-05", 1200]]),
        ]
    )

    with ZipFile(BytesIO(workbook)) as archive:
        names = set(archive.namelist())
        workbook_xml = archive.read("xl/workbook.xml").decode("utf-8")
        first_sheet = archive.read("xl/worksheets/sheet1.xml").decode("utf-8")

    assert "[Content_Types].xml" in names
    assert "xl/worksheets/sheet1.xml" in names
    assert "xl/worksheets/sheet2.xml" in names
    assert "xl/worksheets/sheet3.xml" in names
    assert "明細一覧" in workbook_xml
    assert "Store" in first_sheet
    assert "<v>1200</v>" in first_sheet


def test_export_workbook_requires_at_least_one_sheet() -> None:
    with pytest.raises(ValueError, match="At least one worksheet"):
        export_workbook([])
