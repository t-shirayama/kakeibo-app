export type TransactionDto = {
  transaction_id: string;
  transaction_date: string;
  shop_name: string;
  category_id: string;
  amount: number;
  transaction_type: "expense" | "income";
  payment_method: string | null;
  card_user_name?: string | null;
  memo: string | null;
  category_name?: string;
};

export type CategoryDto = {
  category_id: string;
  name: string;
  color: string;
  description: string | null;
  is_active: boolean;
};

export type IncomeOverrideDto = {
  override_id: string;
  target_month: string;
  amount: number;
  day: number;
};

export type IncomeSettingDto = {
  income_setting_id: string;
  member_name: string;
  category_id: string;
  base_amount: number;
  base_day: number;
  overrides: IncomeOverrideDto[];
};

export type CategorySummaryDto = {
  category_id: string;
  name: string;
  color: string;
  amount: number;
  ratio: number;
};

export type UploadJobDto = {
  upload_id: string;
  file_name: string;
  stored_file_path: string;
  status: "processing" | "completed" | "failed";
  imported_count: number;
  error_message: string | null;
  uploaded_at: string;
};

export type MonthlyReportDto = {
  period: string;
  start_date: string;
  end_date: string;
  total_expense: number;
  average_daily_expense: number;
  max_category: CategorySummaryDto | null;
  min_category: CategorySummaryDto | null;
  category_summaries: CategorySummaryDto[];
  period_summaries: Array<{
    period: string;
    total_expense: number;
    total_income: number;
    balance: number;
    transaction_count: number;
  }>;
};
