import type {
  AuditLogListResponse,
  CategoryRuleRequest as GeneratedCategoryRuleRequest,
  CategoryRuleResponse,
  CategoryRequest as GeneratedCategoryRequest,
  DashboardSummaryResponse,
  DeleteDataRequest,
  GetDashboardSummaryParams,
  GetMonthlyReportParams,
  GetRecentTransactionsParams,
  IncomeOverrideRequest as GeneratedIncomeOverrideRequest,
  IncomeSettingRequest as GeneratedIncomeSettingRequest,
  ListAuditLogsParams,
  ListCategoriesParams,
  ListCategorySummariesParams,
  ListTransactionsParams,
  LoginRequest as GeneratedLoginRequest,
  ReportResponse,
  SettingsResponse,
  TransactionListResponse,
  TransactionRequest as GeneratedTransactionRequest,
  UpdateSettingsRequest,
} from "../generated/openapi-client";
import type {
  CategoryDto,
  CategoryRuleDto,
  CategorySummaryDto,
  DashboardSummaryDto,
  IncomeSettingDto,
  MonthlyReportDto,
  SettingsDto,
  TransactionDto,
  UploadJobDto,
  UserDto,
} from "../types";

export type ApiClient = {
  list_transactions: (params?: TransactionListParams) => Promise<TransactionListResponse>;
  list_all_transactions: (params?: TransactionListParams) => Promise<TransactionDto[]>;
  list_categories: (params?: CategoryListParams) => Promise<CategoryDto[]>;
  list_category_rules: (params?: CategoryRuleListParams) => Promise<CategoryRuleDto[]>;
  create_category_rule: (request: CategoryRuleRequest) => Promise<CategoryRuleDto>;
  update_category_rule: (ruleId: string, request: CategoryRuleRequest) => Promise<CategoryRuleDto>;
  set_category_rule_active: (ruleId: string, isActive: boolean) => Promise<CategoryRuleDto>;
  delete_category_rule: (ruleId: string) => Promise<{ status: string }>;
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
export type CategoryRuleRequest = GeneratedCategoryRuleRequest;
export type CategoryListParams = Pick<ListCategoriesParams, "include_inactive">;
export type CategoryRuleListParams = { include_inactive?: boolean };
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

export type {
  CategoryDto,
  CategoryRuleDto,
  CategoryRuleResponse,
  CategorySummaryDto,
  DashboardSummaryResponse,
  DeleteDataRequest,
  MonthlyReportDto,
  ReportResponse,
  SettingsResponse,
  TransactionDto,
};
