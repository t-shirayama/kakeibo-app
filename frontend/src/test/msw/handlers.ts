import { http, HttpResponse } from "msw";
import {
  dashboardSummary,
  mockCategories,
  mockCategoryRules,
  mockSettings,
  mockUploadJobs,
  mockUser,
  transactionList,
} from "./fixtures";
import { apiUrl } from "./http";

export const handlers = [
  http.get(apiUrl("/api/auth/csrf"), () => HttpResponse.json({ csrf_token: "test-csrf-token" })),
  http.post(apiUrl("/api/auth/login"), () => HttpResponse.json(mockUser)),
  http.get(apiUrl("/api/settings"), () => HttpResponse.json(mockSettings)),
  http.get(apiUrl("/api/categories"), () => HttpResponse.json(mockCategories)),
  http.get(apiUrl("/api/category-rules"), () => HttpResponse.json(mockCategoryRules)),
  http.get(apiUrl("/api/transactions"), () => HttpResponse.json(transactionList())),
  http.get(apiUrl("/api/uploads"), () => HttpResponse.json(mockUploadJobs)),
  http.get(apiUrl("/api/dashboard/summary"), ({ request }) => {
    const url = new URL(request.url);
    const year = url.searchParams.get("year") ?? "2026";
    const month = (url.searchParams.get("month") ?? "5").padStart(2, "0");
    return HttpResponse.json(dashboardSummary(`${year}-${month}`));
  }),
];
