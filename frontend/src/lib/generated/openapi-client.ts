/* eslint-disable */
// This file is auto-generated from FastAPI OpenAPI. Do not edit by hand.

export type RequestConfig = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: BodyInit | null;
  headers?: HeadersInit;
};

export type GeneratedApiTransport = {
  requestJson<T>(config: RequestConfig): Promise<T>;
  requestBlob(config: RequestConfig): Promise<Blob>;
};

function appendQuery(path: string, params?: Record<string, unknown>) {
  if (!params) {
    return path;
  }
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    searchParams.set(key, String(value));
  }
  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

function toJsonBody(body: unknown) {
  return JSON.stringify(body);
}

export type AuditLogEntryResponse = {
  audit_log_id: string;
  user_id: string;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, unknown>;
  created_at: string;
};

export type AuditLogListResponse = {
  items: Array<AuditLogEntryResponse>;
  total: number;
  page: number;
  page_size: number;
};

export type Body_upload_pdf_api_uploads_post = {
  file: string;
};

export type CategoryRequest = {
  name: string;
  color: string;
  description?: string | null;
};

export type CategoryResponse = {
  category_id: string;
  name: string;
  color: string;
  description: string | null;
  is_active: boolean;
};

export type CategoryStatusRequest = {
  is_active: boolean;
};

export type CategorySummaryResponse = {
  category_id: string;
  name: string;
  color: string;
  amount: number;
  ratio: number;
};

export type CreateUserRequest = {
  email: string;
  password: string;
  is_admin?: boolean;
};

export type CsrfTokenResponse = {
  csrf_token: string;
};

export type DashboardSummaryResponse = {
  year_month: string;
  total_expense: number;
  total_income: number;
  balance: number;
  transaction_count: number;
  expense_change: number;
  income_change: number;
  balance_change: number;
  transaction_count_change: number;
  category_summaries: Array<CategorySummaryResponse>;
  monthly_summaries: Array<PeriodSummaryResponse>;
};

export type DeleteDataRequest = {
  confirmation_text?: string | null;
  password?: string | null;
};

export type HTTPValidationError = {
  detail?: Array<ValidationError>;
};

export type IncomeOverrideRequest = {
  amount: number;
  day: number;
};

export type IncomeOverrideResponse = {
  override_id: string;
  target_month: string;
  amount: number;
  day: number;
};

export type IncomeSettingRequest = {
  member_name: string;
  category_id: string;
  base_amount: number;
  base_day: number;
};

export type IncomeSettingResponse = {
  income_setting_id: string;
  member_name: string;
  category_id: string;
  base_amount: number;
  base_day: number;
  overrides: Array<IncomeOverrideResponse>;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type PasswordResetConfirmRequest = {
  reset_token: string;
  new_password: string;
};

export type PasswordResetStartRequest = {
  email: string;
};

export type PasswordResetStartResponse = {
  status: string;
  reset_token: string | null;
};

export type PeriodSummaryResponse = {
  period: string;
  total_expense: number;
  total_income: number;
  balance: number;
  transaction_count: number;
};

export type RecentTransactionResponse = {
  transaction_id: string;
  transaction_date: string;
  shop_name: string;
  category_id: string;
  category_name: string;
  amount: number;
  transaction_type: string;
  payment_method: string | null;
  memo: string | null;
};

export type ReportResponse = {
  period: string;
  start_date: string;
  end_date: string;
  total_expense: number;
  average_daily_expense: number;
  max_category: CategorySummaryResponse | null;
  min_category: CategorySummaryResponse | null;
  category_summaries: Array<CategorySummaryResponse>;
  period_summaries: Array<PeriodSummaryResponse>;
};

export type SameShopCategoryRequest = {
  shop_name: string;
  category_id: string;
};

export type SameShopCategoryResponse = {
  updated_count: number;
};

export type SameShopCountResponse = {
  count: number;
};

export type SettingsResponse = {
  user_id: string;
  currency: string;
  timezone: string;
  date_format: string;
  page_size: number;
  dark_mode: boolean;
};

export type TransactionListResponse = {
  items: Array<TransactionResponse>;
  total: number;
  page: number;
  page_size: number;
};

export type TransactionRequest = {
  transaction_date: string;
  shop_name: string;
  amount: number;
  transaction_type?: TransactionType;
  category_id?: string | null;
  payment_method?: string | null;
  card_user_name?: string | null;
  memo?: string | null;
};

export type TransactionResponse = {
  transaction_id: string;
  category_id: string;
  display_category_id?: string | null;
  category_name?: string | null;
  category_color?: string | null;
  transaction_date: string;
  shop_name: string;
  amount: number;
  transaction_type: TransactionType;
  payment_method: string | null;
  card_user_name: string | null;
  memo: string | null;
  source_upload_id: string | null;
  source_file_name: string | null;
  source_row_number: number | null;
  source_page_number: number | null;
  source_format: string | null;
  source_hash: string | null;
};

export type TransactionType = "expense" | "income";

export type UpdateSettingsRequest = {
  page_size: number;
  date_format?: string;
  dark_mode?: boolean;
};

export type UploadResponse = {
  upload_id: string;
  file_name: string;
  stored_file_path: string;
  status: UploadStatus;
  imported_count: number;
  error_message: string | null;
  uploaded_at: string;
};

export type UploadStatus = "processing" | "completed" | "failed";

export type UserResponse = {
  user_id: string;
  email: string;
  is_admin: boolean;
};

export type ValidationError = {
  loc: Array<string | number>;
  msg: string;
  type: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
};

export type ListTransactionsParams = {
  page?: number;
  page_size?: number;
  keyword?: string | null;
  category_id?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  sort_field?: "date" | "amount";
  sort_direction?: "asc" | "desc";
};

export type ExportTransactionsParams = {
  keyword?: string | null;
  category_id?: string | null;
  date_from?: string | null;
  date_to?: string | null;
};

export type UpdateTransactionParams = {
  transaction_id: string;
};

export type CountSameShopTransactionsParams = {
  transaction_id: string;
};

export type UpdateSameShopCategoryParams = {
  transaction_id: string;
};

export type DeleteTransactionParams = {
  transaction_id: string;
};

export type ListCategoriesParams = {
  include_inactive?: boolean;
};

export type UpdateCategoryParams = {
  category_id: string;
};

export type SetCategoryActiveParams = {
  category_id: string;
};

export type DeleteCategoryParams = {
  category_id: string;
};

export type UpdateIncomeSettingParams = {
  income_setting_id: string;
};

export type DeleteIncomeSettingParams = {
  income_setting_id: string;
};

export type UpsertIncomeOverrideParams = {
  income_setting_id: string;
  target_month: string;
};

export type DeleteIncomeOverrideParams = {
  income_setting_id: string;
  target_month: string;
};

export type GetUploadParams = {
  upload_id: string;
};

export type DeleteUploadParams = {
  upload_id: string;
};

export type GetDashboardSummaryParams = {
  year?: number | null;
  month?: number | null;
};

export type GetRecentTransactionsParams = {
  limit?: number;
};

export type ListCategorySummariesParams = {
  start_date?: string | null;
  end_date?: string | null;
};

export type GetMonthlyReportParams = {
  year?: number | null;
  month?: number | null;
};

export type ListAuditLogsParams = {
  page?: number;
  page_size?: number;
  action?: string | null;
  resource_type?: string | null;
  date_from?: string | null;
  date_to?: string | null;
};


export function createGeneratedApiClient(transport: GeneratedApiTransport) {
  return {
login: (body: LoginRequest) => transport.requestJson<UserResponse>({ method: "POST", path: "/api/auth/login", body: toJsonBody(body), headers: { "Content-Type": "application/json" } }),
get_settings: () => transport.requestJson<SettingsResponse>({ method: "GET", path: "/api/settings", body: undefined, headers: {} }),
update_settings: (body: UpdateSettingsRequest) => transport.requestJson<SettingsResponse>({ method: "PUT", path: "/api/settings", body: toJsonBody(body), headers: { "Content-Type": "application/json" } }),
delete_all_data: (body: DeleteDataRequest) => transport.requestJson<Record<string, string>>({ method: "DELETE", path: "/api/settings/data", body: toJsonBody(body), headers: { "Content-Type": "application/json" } }),
export_user_data: () => transport.requestBlob({ method: "POST", path: "/api/settings/export", body: undefined, headers: {} }),
list_transactions: (params: ListTransactionsParams = {}) => transport.requestJson<TransactionListResponse>({ method: "GET", path: appendQuery("/api/transactions", { page: params.page, page_size: params.page_size, keyword: params.keyword, category_id: params.category_id, date_from: params.date_from, date_to: params.date_to, sort_field: params.sort_field, sort_direction: params.sort_direction }), body: undefined, headers: {} }),
export_transactions: (params: ExportTransactionsParams = {}) => transport.requestBlob({ method: "GET", path: appendQuery("/api/transactions/export", { keyword: params.keyword, category_id: params.category_id, date_from: params.date_from, date_to: params.date_to }), body: undefined, headers: {} }),
create_transaction: (body: TransactionRequest) => transport.requestJson<TransactionResponse>({ method: "POST", path: "/api/transactions", body: toJsonBody(body), headers: { "Content-Type": "application/json" } }),
update_transaction: (params: UpdateTransactionParams, body: TransactionRequest) => transport.requestJson<TransactionResponse>({ method: "PUT", path: `/api/transactions/${params.transaction_id}`, body: toJsonBody(body), headers: { "Content-Type": "application/json" } }),
count_same_shop_transactions: (params: CountSameShopTransactionsParams) => transport.requestJson<SameShopCountResponse>({ method: "GET", path: `/api/transactions/${params.transaction_id}/same-shop-count`, body: undefined, headers: {} }),
update_same_shop_category: (params: UpdateSameShopCategoryParams, body: SameShopCategoryRequest) => transport.requestJson<SameShopCategoryResponse>({ method: "PATCH", path: `/api/transactions/${params.transaction_id}/same-shop-category`, body: toJsonBody(body), headers: { "Content-Type": "application/json" } }),
delete_transaction: (params: DeleteTransactionParams) => transport.requestJson<Record<string, string>>({ method: "DELETE", path: `/api/transactions/${params.transaction_id}`, body: undefined, headers: {} }),
list_categories: (params: ListCategoriesParams = {}) => transport.requestJson<Array<CategoryResponse>>({ method: "GET", path: appendQuery("/api/categories", { include_inactive: params.include_inactive }), body: undefined, headers: {} }),
create_category: (body: CategoryRequest) => transport.requestJson<CategoryResponse>({ method: "POST", path: "/api/categories", body: toJsonBody(body), headers: { "Content-Type": "application/json" } }),
update_category: (params: UpdateCategoryParams, body: CategoryRequest) => transport.requestJson<CategoryResponse>({ method: "PUT", path: `/api/categories/${params.category_id}`, body: toJsonBody(body), headers: { "Content-Type": "application/json" } }),
set_category_active: (params: SetCategoryActiveParams, body: CategoryStatusRequest) => transport.requestJson<CategoryResponse>({ method: "PATCH", path: `/api/categories/${params.category_id}/status`, body: toJsonBody(body), headers: { "Content-Type": "application/json" } }),
delete_category: (params: DeleteCategoryParams) => transport.requestJson<Record<string, string>>({ method: "DELETE", path: `/api/categories/${params.category_id}`, body: undefined, headers: {} }),
list_income_settings: () => transport.requestJson<Array<IncomeSettingResponse>>({ method: "GET", path: "/api/income-settings", body: undefined, headers: {} }),
create_income_setting: (body: IncomeSettingRequest) => transport.requestJson<IncomeSettingResponse>({ method: "POST", path: "/api/income-settings", body: toJsonBody(body), headers: { "Content-Type": "application/json" } }),
update_income_setting: (params: UpdateIncomeSettingParams, body: IncomeSettingRequest) => transport.requestJson<IncomeSettingResponse>({ method: "PUT", path: `/api/income-settings/${params.income_setting_id}`, body: toJsonBody(body), headers: { "Content-Type": "application/json" } }),
delete_income_setting: (params: DeleteIncomeSettingParams) => transport.requestJson<Record<string, string>>({ method: "DELETE", path: `/api/income-settings/${params.income_setting_id}`, body: undefined, headers: {} }),
upsert_income_override: (params: UpsertIncomeOverrideParams, body: IncomeOverrideRequest) => transport.requestJson<IncomeSettingResponse>({ method: "PUT", path: `/api/income-settings/${params.income_setting_id}/overrides/${params.target_month}`, body: toJsonBody(body), headers: { "Content-Type": "application/json" } }),
delete_income_override: (params: DeleteIncomeOverrideParams) => transport.requestJson<IncomeSettingResponse>({ method: "DELETE", path: `/api/income-settings/${params.income_setting_id}/overrides/${params.target_month}`, body: undefined, headers: {} }),
list_uploads: () => transport.requestJson<Array<UploadResponse>>({ method: "GET", path: "/api/uploads", body: undefined, headers: {} }),
upload_pdf: (body: FormData) => transport.requestJson<UploadResponse>({ method: "POST", path: "/api/uploads", body: body, headers: {} }),
get_upload: (params: GetUploadParams) => transport.requestJson<UploadResponse>({ method: "GET", path: `/api/uploads/${params.upload_id}`, body: undefined, headers: {} }),
delete_upload: (params: DeleteUploadParams) => transport.requestJson<Record<string, string>>({ method: "DELETE", path: `/api/uploads/${params.upload_id}`, body: undefined, headers: {} }),
get_dashboard_summary: (params: GetDashboardSummaryParams = {}) => transport.requestJson<DashboardSummaryResponse>({ method: "GET", path: appendQuery("/api/dashboard/summary", { year: params.year, month: params.month }), body: undefined, headers: {} }),
get_recent_transactions: (params: GetRecentTransactionsParams = {}) => transport.requestJson<Array<RecentTransactionResponse>>({ method: "GET", path: appendQuery("/api/dashboard/recent-transactions", { limit: params.limit }), body: undefined, headers: {} }),
list_category_summaries: (params: ListCategorySummariesParams = {}) => transport.requestJson<Array<CategorySummaryResponse>>({ method: "GET", path: appendQuery("/api/reports/categories", { start_date: params.start_date, end_date: params.end_date }), body: undefined, headers: {} }),
get_monthly_report: (params: GetMonthlyReportParams = {}) => transport.requestJson<ReportResponse>({ method: "GET", path: appendQuery("/api/reports/monthly", { year: params.year, month: params.month }), body: undefined, headers: {} }),
list_audit_logs: (params: ListAuditLogsParams = {}) => transport.requestJson<AuditLogListResponse>({ method: "GET", path: appendQuery("/api/audit-logs", { page: params.page, page_size: params.page_size, action: params.action, resource_type: params.resource_type, date_from: params.date_from, date_to: params.date_to }), body: undefined, headers: {} })
  };
}
