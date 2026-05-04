import type { CategoryDto, CategorySummaryDto, IncomeSettingDto, MonthlyReportDto, TransactionDto, UploadJobDto } from "./types";
import { clear_csrf_token, get_csrf_token } from "./csrf";
import { getLoginPath } from "./auth";
import type { ApiErrorShape } from "@/components/api-error-alert";

export type ApiClient = {
  list_transactions: (params?: TransactionListParams) => Promise<TransactionDto[]>;
  list_all_transactions: (params?: TransactionListParams) => Promise<TransactionDto[]>;
  list_categories: (params?: CategoryListParams) => Promise<CategoryDto[]>;
  create_transaction: (request: TransactionRequest) => Promise<TransactionDto>;
  update_transaction: (transactionId: string, request: TransactionRequest) => Promise<TransactionDto>;
  count_same_shop_transactions: (transactionId: string) => Promise<{ count: number }>;
  update_same_shop_category: (transactionId: string, shopName: string, categoryId: string) => Promise<{ updated_count: number }>;
  delete_transaction: (transactionId: string) => Promise<{ status: string }>;
  export_transactions: (params?: TransactionListParams) => Promise<void>;
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
  list_income_settings: () => Promise<IncomeSettingDto[]>;
  create_income_setting: (request: IncomeSettingRequest) => Promise<IncomeSettingDto>;
  update_income_setting: (incomeSettingId: string, request: IncomeSettingRequest) => Promise<IncomeSettingDto>;
  delete_income_setting: (incomeSettingId: string) => Promise<{ status: string }>;
  upsert_income_override: (incomeSettingId: string, targetMonth: string, request: IncomeOverrideRequest) => Promise<IncomeSettingDto>;
  delete_income_override: (incomeSettingId: string, targetMonth: string) => Promise<IncomeSettingDto>;
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
  keyword?: string;
  page?: number;
  page_size?: number;
  date_from?: string;
  date_to?: string;
  category_id?: string;
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

export type IncomeSettingRequest = {
  member_name: string;
  category_id: string;
  base_amount: number;
  base_day: number;
};

export type IncomeOverrideRequest = {
  amount: number;
  day: number;
};

export class ApiError extends Error {
  // バックエンド共通エラー形式を画面で扱いやすいErrorへ包む。
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
  // 変更系APIはCookie認証に加えてCSRFトークンを必ず送る。
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
    // CSRF期限切れの可能性があるため、保持トークンを捨てて一度だけ再試行する。
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
    // リフレッシュできない場合は、現在URLを戻り先としてログインへ誘導する。
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
    const searchParams = new URLSearchParams({ page: String(params.page ?? 1), page_size: String(params.page_size ?? 100) });
    if (params.keyword) {
      searchParams.set("keyword", params.keyword);
    }
    if (params.date_from) {
      searchParams.set("date_from", params.date_from);
    }
    if (params.date_to) {
      searchParams.set("date_to", params.date_to);
    }
    if (params.category_id) {
      searchParams.set("category_id", params.category_id);
    }

    const response = await api_fetch<{ items: TransactionDto[] }>(`/api/transactions?${searchParams.toString()}`);
    return response.items;
  },
  async list_all_transactions(params = {}) {
    const items: TransactionDto[] = [];
    let page = 1;
    let total = 0;

    do {
      const searchParams = new URLSearchParams({ page: String(page), page_size: "100" });
      if (params.keyword) {
        searchParams.set("keyword", params.keyword);
      }
      if (params.date_from) {
        searchParams.set("date_from", params.date_from);
      }
      if (params.date_to) {
        searchParams.set("date_to", params.date_to);
      }
      if (params.category_id) {
        searchParams.set("category_id", params.category_id);
      }

      const response = await api_fetch<{ items: TransactionDto[]; total: number }>(`/api/transactions?${searchParams.toString()}`);
      items.push(...response.items);
      total = response.total;
      page += 1;
    } while (items.length < total);

    return items;
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
  async count_same_shop_transactions(transactionId) {
    return api_fetch<{ count: number }>(`/api/transactions/${transactionId}/same-shop-count`);
  },
  async update_same_shop_category(transactionId, shopName, categoryId) {
    return api_mutation<{ updated_count: number }>(`/api/transactions/${transactionId}/same-shop-category`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop_name: shopName, category_id: categoryId }),
    });
  },
  async delete_transaction(transactionId) {
    return api_mutation<{ status: string }>(`/api/transactions/${transactionId}`, { method: "DELETE" });
  },
  async export_transactions(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.keyword) {
      searchParams.set("keyword", params.keyword);
    }
    if (params.date_from) {
      searchParams.set("date_from", params.date_from);
    }
    if (params.date_to) {
      searchParams.set("date_to", params.date_to);
    }
    if (params.category_id) {
      searchParams.set("category_id", params.category_id);
    }
    const path = `/api/transactions/export${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const response = await retry_after_auth_refresh(path, () =>
      fetch(`${get_api_base_url()}${path}`, { credentials: "include" }),
    );
    if (!response.ok) {
      await parse_json_response<never>(response);
    }
    const blob = await response.blob();
    // fetchで受け取ったExcelをブラウザのダウンロード動作へ橋渡しする。
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
  async list_income_settings() {
    return api_fetch<IncomeSettingDto[]>("/api/income-settings");
  },
  async create_income_setting(request) {
    return api_mutation<IncomeSettingDto>("/api/income-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  },
  async update_income_setting(incomeSettingId, request) {
    return api_mutation<IncomeSettingDto>(`/api/income-settings/${incomeSettingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  },
  async delete_income_setting(incomeSettingId) {
    return api_mutation<{ status: string }>(`/api/income-settings/${incomeSettingId}`, { method: "DELETE" });
  },
  async upsert_income_override(incomeSettingId, targetMonth, request) {
    return api_mutation<IncomeSettingDto>(`/api/income-settings/${incomeSettingId}/overrides/${targetMonth}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
  },
  async delete_income_override(incomeSettingId, targetMonth) {
    return api_mutation<IncomeSettingDto>(`/api/income-settings/${incomeSettingId}/overrides/${targetMonth}`, { method: "DELETE" });
  },
};
