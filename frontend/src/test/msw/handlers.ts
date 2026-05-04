import { http, HttpResponse } from "msw";
import { dashboardSummary, mockCategories, mockSettings, mockUser, transactionList } from "./fixtures";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export const handlers = [
  http.get(`${API_BASE_URL}/api/auth/csrf`, () => HttpResponse.json({ csrf_token: "test-csrf-token" })),
  http.post(`${API_BASE_URL}/api/auth/login`, () => HttpResponse.json(mockUser)),
  http.get(`${API_BASE_URL}/api/settings`, () => HttpResponse.json(mockSettings)),
  http.get(`${API_BASE_URL}/api/categories`, () => HttpResponse.json(mockCategories)),
  http.get(`${API_BASE_URL}/api/transactions`, () => HttpResponse.json(transactionList())),
  http.get(`${API_BASE_URL}/api/dashboard/summary`, ({ request }) => {
    const url = new URL(request.url);
    const year = url.searchParams.get("year") ?? "2026";
    const month = (url.searchParams.get("month") ?? "5").padStart(2, "0");
    return HttpResponse.json(dashboardSummary(`${year}-${month}`));
  }),
];
