export type TransactionDto = {
  transaction_id: string;
  transaction_date: string;
  merchant_name: string;
  category_id: string;
  category_name: string;
  amount: number;
  payment_method: string;
  memo: string | null;
};

export type CategoryDto = {
  category_id: string;
  name: string;
  color: string;
  monthly_budget: number;
  match_keywords: string[];
};

export type CategorySummaryDto = {
  category_id: string;
  name: string;
  color: string;
  amount: number;
  ratio: number;
};

export type UploadJobDto = {
  upload_job_id: string;
  file_name: string;
  status: "queued" | "processing" | "completed" | "failed";
  imported_transaction_count: number;
  created_at: string;
};

export type MonthlyReportDto = {
  year_month: string;
  total_income: number;
  total_expense: number;
  balance: number;
  transaction_count: number;
  category_summaries: CategorySummaryDto[];
};
