import type { CategoryDto, CategorySummaryDto, MonthlyReportDto, TransactionDto, UploadJobDto } from "./types";
import { clear_csrf_token, get_csrf_token } from "./csrf";
import { getLoginPath } from "./auth";
import type { ApiErrorShape } from "@/components/api-error-alert";

export type ApiClient = {
  list_transactions: (params?: TransactionListParams) => Promise<TransactionDto[]>;
  list_categories: (params?: CategoryListParams) => Promise<CategoryDto[]>;
  create_transaction: (request: TransactionRequest) => Promise<TransactionDto>;
  update_transaction: (transactionId: string, request: TransactionRequest) => Promise<TransactionDto>;
  delete_transaction: (transactionId: string) => Promise<{ status: string }>;
  export_transactions: () => Promise<void>;
  list_uploads: () => Promise<UploadJobDto[]>;
  upload_pdf: (file: File) => Promise<UploadJobDto>;
  list_category_summaries: () => Promise<CategorySummaryDto[]>;
  get_monthly_report: () => Promise<MonthlyReportDto>;
  login: (request: LoginRequest) => Promise<UserDto>;
  update_settings: (request: SettingsRequest) => Promise<SettingsDto>;
  delete_all_data: (confirmationText: string) => Promise<{ status: string }>;
  create_category: (request: CategoryRequest) => Promise<CategoryDto>;
  update_category: (categoryId: string, request: CategoryRequest) => Promise<CategoryDto>;
  set_category_active: (categoryId: string, isActive: boolean) => Promise<CategoryDto>;
  delete_category: (categoryId: string) => Promise<{ status: string }>;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type UserDto = {
  user_id: string;
  email: string;
  is_admin: boolean;
};

export type TransactionRequest = {
  transaction_date: string;
  shop_name: string;
  amount: number;
  transaction_type: "expense" | "income";
  category_id: string | null;
  payment_method: string | null;
  card_user_name?: string | null;
  memo: string | null;
};

export type TransactionListParams = {
  date_from?: string;
  date_to?: string;
};

export type CategoryRequest = {
  name: string;
  color: string;
  description: string | null;
};

export type CategoryListParams = {
  include_inactive?: boolean;
};

export type SettingsRequest = {
  page_size: number;
  date_format: string;
  dark_mode: boolean;
};

export type SettingsDto = SettingsRequest & {
  user_id: string;
  currency: string;
  timezone: string;
};

export class ApiError extends Error {
  readonly code?: string;
  readonly details?: unknown;
  readonly request_id?: string;
  readonly status: number;

  constructor(status: number, error: ApiErrorShape) {
    super(error.message || "APIリクエストに失敗しました。");
    this.name = "ApiError";
    this.status = status;
    this.code = error.code;
    this.details = error.details;
    this.request_id = error.request_id;
  }
}

export async function with_csrf_headers(init: RequestInit = {}): Promise<RequestInit> {
  const headers = new Headers(init.headers);
  headers.set("X-CSRF-Token", await get_csrf_token());

  return {
    ...init,
    credentials: "include",
    headers,
  };
}

export async function api_fetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await retry_after_auth_refresh(path, () =>
    retry_after_csrf_refresh(
      () => fetch(`${get_api_base_url()}${path}`, { ...init, credentials: "include" }),
      async (nextResponse) => nextResponse,
    ),
  );
  return parse_json_response<T>(response);
}

export async function api_mutation<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await retry_after_auth_refresh(path, () =>
    retry_after_csrf_refresh(
      async () => fetch(`${get_api_base_url()}${path}`, await with_csrf_headers(init)),
      async (nextResponse) => nextResponse,
    ),
  );
  return parse_json_response<T>(response);
}

export async function retry_after_csrf_refresh<T>(
  request: () => Promise<Response>,
  parse: (response: Response) => Promise<T>,
): Promise<T> {
  let response = await request();
  if (response.status === 403) {
    clear_csrf_token();
    response = await request();
  }
  return parse(response);
}

async function retry_after_auth_refresh(path: string, request: () => Promise<Response>): Promise<Response> {
  let response = await request();
  if (response.status !== 401 || skips_auth_redirect(path)) {
    return response;
  }

  const refreshed = await refresh_auth_session();
  if (!refreshed) {
    redirect_to_login();
    return response;
  }

  response = await request();
  if (response.status === 401) {
    redirect_to_login();
  }
  return response;
}

async function refresh_auth_session(): Promise<boolean> {
  const response = await retry_after_csrf_refresh(
    async () =>
      fetch(`${get_api_base_url()}/api/auth/refresh`, await with_csrf_headers({ method: "POST" })),
    async (nextResponse) => nextResponse,
  );
  return response.ok;
}

function skips_auth_redirect(path: string): boolean {
  return [
    "/api/auth/csrf",
    "/api/auth/login",
    "/api/auth/refresh",
    "/api/auth/password-reset",
    "/api/auth/password-reset/confirm",
  ].includes(path);
}

function redirect_to_login(): void {
  if (typeof window === "undefined" || window.location.pathname === "/login") {
    return;
  }

  window.location.assign(getLoginPath(`${window.location.pathname}${window.location.search}`));
}

async function parse_json_response<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : null;
  if (!response.ok) {
    throw new ApiError(response.status, body?.error ?? { message: response.statusText });
  }
  return body as T;
}

export function get_api_base_url(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
}

export const api: ApiClient = {
  async list_transactions(params = {}) {
    const searchParams = new URLSearchParams({ page: "1", page_size: "100" });
    if (params.date_from) {
      searchParams.set("date_from", params.date_from);
    }
    if (params.date_to) {
      searchParams.set("date_to", params.date_to);
    }

    const response = await api_fetch<{ items: TransactionDto[] }>(`/api/transactions?${searchParams.toString()}`);
    return response.items;
  },
  async list_categories(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.include_inactive) {
      searchParams.set("include_inactive", "true");
    }
    const queryString = searchParams.toString();
    return api_fetch<CategoryDto[]>(`/api/categories${queryString ? `?${queryString}` : ""}`);
  },
  async create_transaction(request) {
    return api_mutation<TransactionDto>("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  },
  async update_transaction(transactionId, request) {
    return api_mutation<TransactionDto>(`/api/transactions/${transactionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  },
  async delete_transaction(transactionId) {
    return api_mutation<{ status: string }>(`/api/transactions/${transactionId}`, { method: "DELETE" });
  },
  async export_transactions() {
    const response = await retry_after_auth_refresh("/api/transactions/export", () =>
      fetch(`${get_api_base_url()}/api/transactions/export`, { credentials: "include" }),
    );
    if (!response.ok) {
      await parse_json_response<never>(response);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kakeibo-export.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  },
  async list_uploads() {
    return api_fetch<UploadJobDto[]>("/api/uploads");
  },
  async upload_pdf(file) {
    const formData = new FormData();
    formData.append("file", file);
    return api_mutation<UploadJobDto>("/api/uploads", {
      method: "POST",
      body: formData,
    });
  },
  async list_category_summaries() {
    return api_fetch<CategorySummaryDto[]>("/api/reports/categories");
  },
  async get_monthly_report() {
    return api_fetch<MonthlyReportDto>("/api/reports/monthly");
  },
  async login(request) {
    return api_mutation<UserDto>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  },
  async update_settings(request) {
    return api_mutation<SettingsDto>("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  },
  async delete_all_data(confirmationText) {
    return api_mutation<{ status: string }>("/api/settings/data", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation_text: confirmationText }),
    });
  },
  async create_category(request) {
    return api_mutation<CategoryDto>("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  },
  async update_category(categoryId, request) {
    return api_mutation<CategoryDto>(`/api/categories/${categoryId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  },
  async set_category_active(categoryId, isActive) {
    return api_mutation<CategoryDto>(`/api/categories/${categoryId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: isActive }),
    });
  },
  async delete_category(categoryId) {
    return api_mutation<{ status: string }>(`/api/categories/${categoryId}`, { method: "DELETE" });
  },
};
