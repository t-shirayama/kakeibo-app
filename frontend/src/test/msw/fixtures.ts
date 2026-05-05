import type {
  CategoryResponse,
  DashboardSummaryResponse,
  SettingsResponse,
  TransactionListResponse,
  TransactionResponse,
  UploadResponse,
  UserResponse,
} from "@/lib/generated/openapi-client";

export const mockUser: UserResponse = {
  user_id: "user-1",
  email: "sample@example.com",
  is_admin: false,
};

export const mockSettings: SettingsResponse = {
  user_id: "user-1",
  currency: "JPY",
  timezone: "Asia/Tokyo",
  date_format: "YYYY-MM-DD",
  page_size: 10,
  dark_mode: false,
};

export const mockCategories: CategoryResponse[] = [
  {
    category_id: "cat-food",
    name: "食費",
    color: "#f97316",
    description: "毎日の食事",
    monthly_budget: 40000,
    is_active: true,
  },
  {
    category_id: "cat-transport",
    name: "交通費",
    color: "#0ea5e9",
    description: "移動費",
    monthly_budget: 12000,
    is_active: true,
  },
];

export const mockTransactions: TransactionResponse[] = [
  {
    transaction_id: "tx-1",
    category_id: "cat-food",
    display_category_id: "cat-food",
    category_name: "食費",
    category_color: "#f97316",
    transaction_date: "2026-05-03",
    shop_name: "スーパー青空",
    amount: 2480,
    transaction_type: "expense",
    payment_method: "クレジットカード",
    card_user_name: null,
    memo: "夕食の買い物",
    source_upload_id: null,
    source_file_name: null,
    source_row_number: null,
    source_page_number: null,
    source_format: null,
    source_hash: null,
  },
  {
    transaction_id: "tx-2",
    category_id: "cat-transport",
    display_category_id: "cat-transport",
    category_name: "交通費",
    category_color: "#0ea5e9",
    transaction_date: "2026-05-02",
    shop_name: "東京メトロ",
    amount: 320,
    transaction_type: "expense",
    payment_method: "交通系IC",
    card_user_name: null,
    memo: null,
    source_upload_id: null,
    source_file_name: null,
    source_row_number: null,
    source_page_number: null,
    source_format: null,
    source_hash: null,
  },
];

export const mockUploadJobs: UploadResponse[] = [
  {
    upload_id: "upload-1",
    file_name: "2026_04_楽天カード.pdf",
    stored_file_path: "storage/uploads/sample/upload-1/original.pdf",
    status: "completed",
    imported_count: 8,
    error_message: null,
    uploaded_at: "2026-05-01 09:12",
  },
  {
    upload_id: "upload-2",
    file_name: "2026_05_読み取り不可.pdf",
    stored_file_path: "storage/uploads/sample/upload-2/original.pdf",
    status: "failed",
    imported_count: 0,
    error_message: "明細行を抽出できませんでした。",
    uploaded_at: "2026-05-02 11:40",
  },
];

export function transactionList(items = mockTransactions): TransactionListResponse {
  return {
    items,
    total: items.length,
    page: 1,
    page_size: 10,
  };
}

export function dashboardSummary(yearMonth = "2026-05"): DashboardSummaryResponse {
  return {
    year_month: yearMonth,
    total_expense: yearMonth === "2026-04" ? 42000 : 52800,
    total_income: yearMonth === "2026-04" ? 250000 : 260000,
    balance: yearMonth === "2026-04" ? 208000 : 207200,
    transaction_count: yearMonth === "2026-04" ? 11 : 14,
    expense_change: yearMonth === "2026-04" ? -3000 : 10800,
    income_change: yearMonth === "2026-04" ? 0 : 10000,
    balance_change: yearMonth === "2026-04" ? 3000 : -800,
    transaction_count_change: yearMonth === "2026-04" ? -2 : 3,
    budget_summary: {
      total_budget: 52000,
      actual_expense: yearMonth === "2026-04" ? 42000 : 52800,
      remaining_amount: yearMonth === "2026-04" ? 10000 : -800,
      progress_ratio: yearMonth === "2026-04" ? 42000 / 52000 : 52800 / 52000,
      is_over_budget: yearMonth !== "2026-04",
      configured_category_count: 2,
    },
    category_budget_summaries: [
      {
        category_id: "cat-food",
        name: "食費",
        color: "#f97316",
        budget_amount: 40000,
        actual_amount: yearMonth === "2026-04" ? 28000 : 36000,
        remaining_amount: yearMonth === "2026-04" ? 12000 : 4000,
        progress_ratio: yearMonth === "2026-04" ? 0.7 : 0.9,
        is_over_budget: false,
      },
      {
        category_id: "cat-transport",
        name: "交通費",
        color: "#0ea5e9",
        budget_amount: 12000,
        actual_amount: yearMonth === "2026-04" ? 14000 : 16800,
        remaining_amount: yearMonth === "2026-04" ? -2000 : -4800,
        progress_ratio: yearMonth === "2026-04" ? 1.17 : 1.4,
        is_over_budget: true,
      },
    ],
    category_summaries: [
      {
        category_id: "cat-food",
        name: "食費",
        color: "#f97316",
        amount: yearMonth === "2026-04" ? 28000 : 36000,
        ratio: yearMonth === "2026-04" ? 0.67 : 0.68,
      },
      {
        category_id: "cat-transport",
        name: "交通費",
        color: "#0ea5e9",
        amount: yearMonth === "2026-04" ? 14000 : 16800,
        ratio: yearMonth === "2026-04" ? 0.33 : 0.32,
      },
    ],
    monthly_summaries: monthlySummaries(yearMonth),
  };
}

function monthlySummaries(yearMonth: string): DashboardSummaryResponse["monthly_summaries"] {
  const base =
    yearMonth === "2026-04"
      ? ["2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04"]
      : ["2025-12", "2026-01", "2026-02", "2026-03", "2026-04", yearMonth];

  return base.map((period, index) => ({
    period,
    total_expense: period === yearMonth ? (yearMonth === "2026-04" ? 42000 : 52800) : 42000 + index * 1200,
    total_income: period === yearMonth ? (yearMonth === "2026-04" ? 250000 : 260000) : 250000,
    balance: period === yearMonth ? (yearMonth === "2026-04" ? 208000 : 207200) : 208000 - index * 1200,
    transaction_count: period === yearMonth ? (yearMonth === "2026-04" ? 11 : 14) : 8 + index,
  }));
}
