from __future__ import annotations

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


def fetch_csrf_token(client: TestClient) -> str:
    response = client.get("/api/auth/csrf")
    assert response.status_code == 200
    token = response.json()["csrf_token"]
    assert token
    return token
