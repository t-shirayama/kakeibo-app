import { clear_csrf_token, get_csrf_token } from "./csrf";
import { getLoginPath } from "./auth";
import {
  createGeneratedApiClient,
  type AuditLogListResponse,
  type CategoryRequest as GeneratedCategoryRequest,
  type DashboardSummaryResponse,
  type DeleteDataRequest,
  type GeneratedApiTransport,
  type GetDashboardSummaryParams,
  type GetMonthlyReportParams,
  type GetRecentTransactionsParams,
  type IncomeOverrideRequest as GeneratedIncomeOverrideRequest,
  type IncomeSettingRequest as GeneratedIncomeSettingRequest,
  type ListAuditLogsParams,
  type ListCategoriesParams,
  type ListCategorySummariesParams,
  type ListTransactionsParams,
  type LoginRequest as GeneratedLoginRequest,
  type ReportResponse,
  type SettingsResponse,
  type TransactionListResponse,
  type TransactionRequest as GeneratedTransactionRequest,
  type UpdateSettingsRequest,
  type UploadResponse,
  type UserResponse,
} from "./generated/openapi-client";
import type {
  AuditLogEntryDto,
  CategoryDto,
  CategorySummaryDto,
  DashboardSummaryDto,
  IncomeSettingDto,
  MonthlyReportDto,
  SettingsDto,
  TransactionDto,
  UploadJobDto,
  UserDto,
} from "./types";
import type { ApiErrorShape } from "@/components/api-error-alert";

export type ApiClient = {
  list_transactions: (params?: TransactionListParams) => Promise<TransactionListResponse>;
  list_all_transactions: (params?: TransactionListParams) => Promise<TransactionDto[]>;
  list_categories: (params?: CategoryListParams) => Promise<CategoryDto[]>;
  create_transaction: (request: TransactionRequest) => Promise<TransactionDto>;
  update_transaction: (transactionId: string, request: TransactionRequest) => Promise<TransactionDto>;
  count_same_shop_transactions: (transactionId: string) => Promise<{ count: number }>;
  update_same_shop_category: (transactionId: string, shopName: string, categoryId: string) => Promise<{ updated_count: number }>;
  delete_transaction: (transactionId: string) => Promise<{ status: string }>;
  export_transactions: (params?: TransactionExportParams) => Promise<void>;
  list_uploads: () => Promise<UploadJobDto[]>;
  upload_pdf: (file: File, options?: UploadPdfOptions) => Promise<UploadJobDto>;
  list_category_summaries: (params?: CategorySummaryListParams) => Promise<CategorySummaryDto[]>;
  get_monthly_report: (params?: MonthlyReportParams) => Promise<MonthlyReportDto>;
  get_dashboard_summary: (params?: DashboardSummaryParams) => Promise<DashboardSummaryDto>;
  get_recent_transactions: (params?: RecentTransactionsParams) => Promise<TransactionDto[]>;
  login: (request: LoginRequest) => Promise<UserDto>;
  get_settings: () => Promise<SettingsDto>;
  update_settings: (request: SettingsRequest) => Promise<SettingsDto>;
  delete_all_data: (confirmationText: string, password?: string) => Promise<{ status: string }>;
  export_user_data: () => Promise<void>;
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
  list_audit_logs: (params?: ListAuditLogsParams) => Promise<AuditLogListResponse>;
};

export type LoginRequest = GeneratedLoginRequest;
export type TransactionRequest = GeneratedTransactionRequest;
export type TransactionListParams = ListTransactionsParams;
export type TransactionExportParams = {
  keyword?: string;
  date_from?: string;
  date_to?: string;
  category_id?: string;
};
export type CategoryRequest = GeneratedCategoryRequest;
export type CategoryListParams = Pick<ListCategoriesParams, "include_inactive">;
export type SettingsRequest = UpdateSettingsRequest;
export type IncomeSettingRequest = GeneratedIncomeSettingRequest;
export type IncomeOverrideRequest = GeneratedIncomeOverrideRequest;
export type AuditLogListParams = ListAuditLogsParams;
export type AuditLogListRequest = ListAuditLogsParams;
export type UploadPdfOptions = {
  onProgress?: (progress: number) => void;
};
export type CategorySummaryListParams = ListCategorySummariesParams;
export type MonthlyReportParams = GetMonthlyReportParams;
export type DashboardSummaryParams = GetDashboardSummaryParams;
export type RecentTransactionsParams = GetRecentTransactionsParams;

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

async function api_blob(path: string, init: RequestInit = {}): Promise<Blob> {
  const response = await retry_after_auth_refresh(path, () =>
    retry_after_csrf_refresh(
      async () => {
        if ((init.method ?? "GET").toUpperCase() === "GET") {
          return fetch(`${get_api_base_url()}${path}`, { ...init, credentials: "include" });
        }
        return fetch(`${get_api_base_url()}${path}`, await with_csrf_headers(init));
      },
      async (nextResponse) => nextResponse,
    ),
  );
  if (!response.ok) {
    await parse_json_response<never>(response);
  }
  return response.blob();
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

const transport: GeneratedApiTransport = {
  requestJson: (config) => {
    const init: RequestInit = {
      method: config.method,
      headers: config.headers,
      body: config.body,
    };
    if (config.method === "GET") {
      return api_fetch(config.path, init);
    }
    return api_mutation(config.path, init);
  },
  requestBlob: (config) =>
    api_blob(config.path, {
      method: config.method,
      headers: config.headers,
      body: config.body,
    }),
};

const generatedApi = createGeneratedApiClient(transport);

export const api: ApiClient = {
  async list_transactions(params = {}) {
    return generatedApi.list_transactions(params);
  },
  async list_all_transactions(params = {}) {
    const items: TransactionDto[] = [];
    let page = 1;
    let total = 0;
    const pageSize = 100;

    do {
      const response = await generatedApi.list_transactions({
        ...params,
        page,
        page_size: pageSize,
      });
      items.push(...response.items);
      total = response.total;
      page += 1;
    } while (items.length < total);

    return items;
  },
  async list_categories(params = {}) {
    return generatedApi.list_categories(params);
  },
  async create_transaction(request) {
    return generatedApi.create_transaction(request);
  },
  async update_transaction(transactionId, request) {
    return generatedApi.update_transaction({ transaction_id: transactionId }, request);
  },
  async count_same_shop_transactions(transactionId) {
    return generatedApi.count_same_shop_transactions({ transaction_id: transactionId });
  },
  async update_same_shop_category(transactionId, shopName, categoryId) {
    return generatedApi.update_same_shop_category(
      { transaction_id: transactionId },
      { shop_name: shopName, category_id: categoryId },
    );
  },
  async delete_transaction(transactionId) {
    return generatedApi.delete_transaction({ transaction_id: transactionId }) as Promise<{ status: string }>;
  },
  async export_transactions(params = {}) {
    const blob = await generatedApi.export_transactions(params);
    downloadBlob(blob, "kakeibo-export.xlsx");
  },
  async list_uploads() {
    return generatedApi.list_uploads();
  },
  async upload_pdf(file, options) {
    const formData = new FormData();
    formData.append("file", file);
    return uploadPdfWithProgress(formData, options);
  },
  async list_category_summaries(params = {}) {
    return generatedApi.list_category_summaries(params);
  },
  async get_monthly_report(params = {}) {
    return generatedApi.get_monthly_report(params) as Promise<ReportResponse>;
  },
  async get_dashboard_summary(params = {}) {
    return generatedApi.get_dashboard_summary(params) as Promise<DashboardSummaryResponse>;
  },
  async get_recent_transactions(params = {}) {
    const rows = await generatedApi.get_recent_transactions(params);
    return rows.map((row) => ({
      ...row,
      display_category_id: row.category_id,
      category_color: undefined,
      transaction_type: row.transaction_type as TransactionDto["transaction_type"],
      card_user_name: null,
      source_upload_id: null,
      source_file_name: null,
      source_row_number: null,
      source_page_number: null,
      source_format: null,
      source_hash: null,
    }));
  },
  async login(request) {
    return generatedApi.login(request);
  },
  async get_settings() {
    return generatedApi.get_settings() as Promise<SettingsResponse>;
  },
  async update_settings(request) {
    return generatedApi.update_settings(request) as Promise<SettingsResponse>;
  },
  async delete_all_data(confirmationText, password) {
    const body: DeleteDataRequest = {
      confirmation_text: confirmationText || undefined,
      password: password || undefined,
    };
    return generatedApi.delete_all_data(body) as Promise<{ status: string }>;
  },
  async export_user_data() {
    const blob = await generatedApi.export_user_data();
    downloadBlob(blob, "kakeibo-export.xlsx");
  },
  async create_category(request) {
    return generatedApi.create_category(request);
  },
  async update_category(categoryId, request) {
    return generatedApi.update_category({ category_id: categoryId }, request);
  },
  async set_category_active(categoryId, isActive) {
    return generatedApi.set_category_active({ category_id: categoryId }, { is_active: isActive });
  },
  async delete_category(categoryId) {
    return generatedApi.delete_category({ category_id: categoryId }) as Promise<{ status: string }>;
  },
  async list_income_settings() {
    return generatedApi.list_income_settings();
  },
  async create_income_setting(request) {
    return generatedApi.create_income_setting(request);
  },
  async update_income_setting(incomeSettingId, request) {
    return generatedApi.update_income_setting({ income_setting_id: incomeSettingId }, request);
  },
  async delete_income_setting(incomeSettingId) {
    return generatedApi.delete_income_setting({ income_setting_id: incomeSettingId }) as Promise<{ status: string }>;
  },
  async upsert_income_override(incomeSettingId, targetMonth, request) {
    return generatedApi.upsert_income_override({ income_setting_id: incomeSettingId, target_month: targetMonth }, request);
  },
  async delete_income_override(incomeSettingId, targetMonth) {
    return generatedApi.delete_income_override({ income_setting_id: incomeSettingId, target_month: targetMonth });
  },
  async list_audit_logs(params = {}) {
    return generatedApi.list_audit_logs(params);
  },
};

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

async function uploadPdfWithProgress(formData: FormData, options?: UploadPdfOptions): Promise<UploadResponse> {
  return retryAfterUploadAuthRefresh("/api/uploads", async () => {
    const csrfToken = await get_csrf_token();
    return new Promise<UploadResponse>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${get_api_base_url()}/api/uploads`);
      xhr.withCredentials = true;
      xhr.setRequestHeader("X-CSRF-Token", csrfToken);
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable || !options?.onProgress) {
          return;
        }
        options.onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      };
      xhr.onload = () => {
        try {
          const contentType = xhr.getResponseHeader("content-type") || "";
          const body = contentType.includes("application/json") && xhr.responseText ? JSON.parse(xhr.responseText) : null;
          if (xhr.status >= 200 && xhr.status < 300) {
            options?.onProgress?.(100);
            resolve(body as UploadResponse);
            return;
          }
          reject(new ApiError(xhr.status, body?.error ?? { message: xhr.statusText }));
        } catch (error) {
          reject(error);
        }
      };
      xhr.onerror = () => reject(new Error("アップロードに失敗しました。"));
      xhr.send(formData);
    });
  });
}

async function retryAfterUploadAuthRefresh(path: string, request: () => Promise<UploadResponse>): Promise<UploadResponse> {
  try {
    return await request();
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || skips_auth_redirect(path)) {
      throw error;
    }
  }

  const refreshed = await refresh_auth_session();
  if (!refreshed) {
    redirect_to_login();
    throw new ApiError(401, { message: "認証が必要です。" });
  }
  return request();
}
