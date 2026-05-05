from __future__ import annotations

from io import BytesIO
from pathlib import Path
from zipfile import ZipFile

import fitz
import pytest
from fastapi.testclient import TestClient


pytestmark = pytest.mark.integration


def test_auth_login_refresh_and_csrf_session(client: TestClient, integration_user) -> None:
    missing_csrf_response = client.post(
        "/api/auth/login",
        json={"email": integration_user.email, "password": integration_user.password},
    )
    assert missing_csrf_response.status_code == 403

    csrf_token = fetch_csrf_token(client)
    login_response = client.post(
        "/api/auth/login",
        headers={"X-CSRF-Token": csrf_token},
        json={"email": integration_user.email, "password": integration_user.password},
    )
    assert login_response.status_code == 200
    assert login_response.json()["email"] == integration_user.email
    assert "kakeibo_access" in client.cookies
    assert "kakeibo_refresh" in client.cookies

    me_response = client.get("/api/auth/me")
    assert me_response.status_code == 200
    assert me_response.json()["user_id"] == str(integration_user.user_id)

    refresh_response = client.post("/api/auth/refresh", headers={"X-CSRF-Token": csrf_token})
    assert refresh_response.status_code == 200
    assert refresh_response.json() == {"status": "ok"}


def test_transaction_create_list_update_delete_through_api_and_mysql(authenticated_client: TestClient) -> None:
    csrf_token = fetch_csrf_token(authenticated_client)
    category_response = authenticated_client.post(
        "/api/categories",
        headers={"X-CSRF-Token": csrf_token},
        json={"name": "食費IT", "color": "#ef4444", "description": "Backend IT"},
    )
    assert category_response.status_code == 200
    category_id = category_response.json()["category_id"]

    create_response = authenticated_client.post(
        "/api/transactions",
        headers={"X-CSRF-Token": csrf_token},
        json={
            "transaction_date": "2026-05-10",
            "shop_name": "統合テストスーパー",
            "amount": 2480,
            "transaction_type": "expense",
            "category_id": category_id,
            "payment_method": "クレジットカード",
            "memo": "作成確認",
        },
    )
    assert create_response.status_code == 200
    transaction_id = create_response.json()["transaction_id"]

    list_response = authenticated_client.get(
        "/api/transactions",
        params={"keyword": "統合テスト", "date_from": "2026-05-01", "date_to": "2026-05-31"},
    )
    assert list_response.status_code == 200
    list_payload = list_response.json()
    assert list_payload["total"] == 1
    assert list_payload["items"][0]["shop_name"] == "統合テストスーパー"
    assert list_payload["items"][0]["category_name"] == "食費IT"

    update_response = authenticated_client.put(
        f"/api/transactions/{transaction_id}",
        headers={"X-CSRF-Token": csrf_token},
        json={
            "transaction_date": "2026-05-11",
            "shop_name": "統合テストスーパー改",
            "amount": 3000,
            "transaction_type": "expense",
            "category_id": category_id,
            "payment_method": "現金",
            "memo": "更新確認",
        },
    )
    assert update_response.status_code == 200
    assert update_response.json()["amount"] == 3000
    assert update_response.json()["shop_name"] == "統合テストスーパー改"

    delete_response = authenticated_client.delete(
        f"/api/transactions/{transaction_id}",
        headers={"X-CSRF-Token": csrf_token},
    )
    assert delete_response.status_code == 200
    assert delete_response.json() == {"status": "ok"}

    after_delete_response = authenticated_client.get("/api/transactions", params={"keyword": "統合テストスーパー改"})
    assert after_delete_response.status_code == 200
    assert after_delete_response.json()["total"] == 0


def test_monthly_report_aggregates_transactions_through_api_and_mysql(authenticated_client: TestClient) -> None:
    csrf_token = fetch_csrf_token(authenticated_client)
    category_response = authenticated_client.post(
        "/api/categories",
        headers={"X-CSRF-Token": csrf_token},
        json={"name": "月次IT", "color": "#0ea5e9"},
    )
    assert category_response.status_code == 200
    category_id = category_response.json()["category_id"]

    for payload in (
        {
            "transaction_date": "2026-05-02",
            "shop_name": "月次IT支出",
            "amount": 1200,
            "transaction_type": "expense",
            "category_id": category_id,
        },
        {
            "transaction_date": "2026-05-03",
            "shop_name": "月次IT収入",
            "amount": 5000,
            "transaction_type": "income",
            "category_id": category_id,
        },
        {
            "transaction_date": "2026-04-30",
            "shop_name": "前月IT支出",
            "amount": 9999,
            "transaction_type": "expense",
            "category_id": category_id,
        },
    ):
        response = authenticated_client.post("/api/transactions", headers={"X-CSRF-Token": csrf_token}, json=payload)
        assert response.status_code == 200

    monthly_response = authenticated_client.get("/api/reports/monthly", params={"year": 2026, "month": 5})
    assert monthly_response.status_code == 200
    monthly_payload = monthly_response.json()
    assert monthly_payload["period"] == "2026-05"
    assert monthly_payload["total_expense"] == 1200
    assert monthly_payload["category_summaries"] == [
        {"category_id": category_id, "name": "月次IT", "color": "#0ea5e9", "amount": 1200, "ratio": 1.0}
    ]

    dashboard_response = authenticated_client.get("/api/dashboard/summary", params={"year": 2026, "month": 5})
    assert dashboard_response.status_code == 200
    dashboard_payload = dashboard_response.json()
    assert dashboard_payload["total_expense"] == 1200
    assert dashboard_payload["total_income"] == 5000
    assert dashboard_payload["balance"] == 3800
    assert dashboard_payload["expense_change"] == -8799


def test_category_status_change_normalizes_existing_transactions_to_uncategorized(authenticated_client: TestClient) -> None:
    csrf_token = fetch_csrf_token(authenticated_client)
    category_response = authenticated_client.post(
        "/api/categories",
        headers={"X-CSRF-Token": csrf_token},
        json={"name": "分類確認IT", "color": "#22c55e", "description": "無効化確認"},
    )
    assert category_response.status_code == 200
    category_payload = category_response.json()
    category_id = category_payload["category_id"]

    create_response = authenticated_client.post(
        "/api/transactions",
        headers={"X-CSRF-Token": csrf_token},
        json={
            "transaction_date": "2026-05-12",
            "shop_name": "無効化対象店舗",
            "amount": 1800,
            "transaction_type": "expense",
            "category_id": category_id,
        },
    )
    assert create_response.status_code == 200

    disable_response = authenticated_client.patch(
        f"/api/categories/{category_id}/status",
        headers={"X-CSRF-Token": csrf_token},
        json={"is_active": False},
    )
    assert disable_response.status_code == 200
    assert disable_response.json()["is_active"] is False

    active_categories_response = authenticated_client.get("/api/categories")
    assert active_categories_response.status_code == 200
    assert [item["category_id"] for item in active_categories_response.json()] == []

    all_categories_response = authenticated_client.get("/api/categories", params={"include_inactive": "true"})
    assert all_categories_response.status_code == 200
    assert all_categories_response.json()[0]["category_id"] == category_id
    assert all_categories_response.json()[0]["is_active"] is False

    list_response = authenticated_client.get("/api/transactions", params={"keyword": "未分類"})
    assert list_response.status_code == 200
    item = list_response.json()["items"][0]
    assert item["category_id"] == category_id
    assert item["category_name"] == "未分類"
    assert item["category_color"] == "#6B7280"

    rejected_response = authenticated_client.post(
        "/api/transactions",
        headers={"X-CSRF-Token": csrf_token},
        json={
            "transaction_date": "2026-05-13",
            "shop_name": "無効カテゴリ新規",
            "amount": 500,
            "transaction_type": "expense",
            "category_id": category_id,
        },
    )
    assert rejected_response.status_code == 400
    assert rejected_response.json()["error"]["message"] == "Category is inactive."


def test_pdf_upload_imports_transactions_deduplicates_rows_and_removes_deleted_upload(authenticated_client: TestClient, tmp_path: Path) -> None:
    csrf_token = fetch_csrf_token(authenticated_client)
    pdf_bytes = _build_rakuten_statement_pdf()

    first_upload_response = authenticated_client.post(
        "/api/uploads",
        headers={"X-CSRF-Token": csrf_token},
        files={"file": ("rakuten-statement.pdf", pdf_bytes, "application/pdf")},
    )
    assert first_upload_response.status_code == 200
    first_payload = first_upload_response.json()
    assert first_payload["status"] == "completed"
    assert first_payload["imported_count"] == 3
    assert Path(first_payload["stored_file_path"]).exists()

    transactions_response = authenticated_client.get("/api/transactions", params={"page_size": 10})
    assert transactions_response.status_code == 200
    transactions_payload = transactions_response.json()
    assert transactions_payload["total"] == 3
    source_rows = {(item["shop_name"], item["source_row_number"], item["source_page_number"]) for item in transactions_payload["items"]}
    assert ("セブン-イレブン", 1, 1) in source_rows
    assert all(item["category_name"] == "未分類" for item in transactions_payload["items"])
    assert all(item["source_format"] == "rakuten_card_pdf" for item in transactions_payload["items"])

    categories_response = authenticated_client.get("/api/categories")
    assert categories_response.status_code == 200
    assert categories_response.json()[0]["name"] == "未分類"

    second_upload_response = authenticated_client.post(
        "/api/uploads",
        headers={"X-CSRF-Token": csrf_token},
        files={"file": ("rakuten-statement.pdf", pdf_bytes, "application/pdf")},
    )
    assert second_upload_response.status_code == 200
    assert second_upload_response.json()["imported_count"] == 0

    after_duplicate_response = authenticated_client.get("/api/transactions", params={"page_size": 10})
    assert after_duplicate_response.status_code == 200
    assert after_duplicate_response.json()["total"] == 3

    uploads_response = authenticated_client.get("/api/uploads")
    assert uploads_response.status_code == 200
    assert len(uploads_response.json()) == 2

    delete_response = authenticated_client.delete(
        f"/api/uploads/{first_payload['upload_id']}",
        headers={"X-CSRF-Token": csrf_token},
    )
    assert delete_response.status_code == 200
    assert delete_response.json() == {"status": "ok"}
    assert not Path(first_payload["stored_file_path"]).exists()

    after_delete_uploads = authenticated_client.get("/api/uploads")
    assert after_delete_uploads.status_code == 200
    assert [item["upload_id"] for item in after_delete_uploads.json()] == [second_upload_response.json()["upload_id"]]


def test_transaction_export_returns_filtered_workbook_with_summary_sheets(authenticated_client: TestClient) -> None:
    csrf_token = fetch_csrf_token(authenticated_client)
    category_response = authenticated_client.post(
        "/api/categories",
        headers={"X-CSRF-Token": csrf_token},
        json={"name": "輸出IT", "color": "#f97316"},
    )
    assert category_response.status_code == 200
    category_id = category_response.json()["category_id"]

    for payload in (
        {
            "transaction_date": "2026-05-05",
            "shop_name": "Export Target",
            "amount": 2100,
            "transaction_type": "expense",
            "category_id": category_id,
            "payment_method": "現金",
            "memo": "出力対象",
        },
        {
            "transaction_date": "2026-05-20",
            "shop_name": "Export Income",
            "amount": 50000,
            "transaction_type": "income",
            "category_id": category_id,
        },
        {
            "transaction_date": "2026-04-01",
            "shop_name": "Filtered Out",
            "amount": 999,
            "transaction_type": "expense",
            "category_id": category_id,
        },
    ):
        response = authenticated_client.post("/api/transactions", headers={"X-CSRF-Token": csrf_token}, json=payload)
        assert response.status_code == 200

    export_response = authenticated_client.get(
        "/api/transactions/export",
        params={
            "keyword": "Export",
            "category_id": category_id,
            "date_from": "2026-05-01",
            "date_to": "2026-05-31",
        },
    )
    assert export_response.status_code == 200
    assert export_response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert export_response.headers["content-disposition"] == 'attachment; filename="kakeibo-export.xlsx"'

    workbook_text = _read_workbook_xml(export_response.content)
    assert "明細一覧" in workbook_text
    assert "カテゴリ集計" in workbook_text
    assert "月別集計" in workbook_text
    assert "Export Target" in workbook_text
    assert "Export Income" in workbook_text
    assert "Filtered Out" not in workbook_text
    assert "2026-05" in workbook_text
    assert "輸出IT" in workbook_text


def fetch_csrf_token(client: TestClient) -> str:
    response = client.get("/api/auth/csrf")
    assert response.status_code == 200
    token = response.json()["csrf_token"]
    assert token
    return token


def _build_rakuten_statement_pdf() -> bytes:
    lines = [
        "2026/04/28",
        "セブン-イレブン",
        "本人",
        "1回払い",
        "842円",
        "2026/04/27",
        "Amazon.co.jp",
        "家族",
        "1回払い",
        "3,200円",
        "2026/04/26",
        "取消 サンプルストア",
        "本人",
        "1回払い",
        "-1518円",
    ]
    document = fitz.open()
    page = document.new_page()
    y = 72
    for line in lines:
        page.insert_text((72, y), line, fontsize=12)
        y += 18
    return document.tobytes()


def _read_workbook_xml(content: bytes) -> str:
    with ZipFile(BytesIO(content)) as archive:
        return "\n".join(
            archive.read(name).decode("utf-8")
            for name in archive.namelist()
            if name.endswith(".xml")
        )
