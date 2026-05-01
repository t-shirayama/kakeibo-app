import type { CategoryDto, CategorySummaryDto, TransactionDto, UploadJobDto } from "./types";

export const categories: CategoryDto[] = [
  {
    category_id: "cat_food",
    name: "食費",
    color: "#ff6b7a",
    monthly_budget: 42000,
    match_keywords: ["スーパー", "コンビニ", "カフェ"],
  },
  {
    category_id: "cat_daily",
    name: "日用品",
    color: "#eea932",
    monthly_budget: 16000,
    match_keywords: ["Amazon", "ドラッグストア"],
  },
  {
    category_id: "cat_transport",
    name: "交通費",
    color: "#38a7e0",
    monthly_budget: 18000,
    match_keywords: ["JR", "Suica", "地下鉄"],
  },
  {
    category_id: "cat_entertainment",
    name: "娯楽",
    color: "#9c72de",
    monthly_budget: 22000,
    match_keywords: ["映画", "配信", "書籍"],
  },
];

export const categorySummary: CategorySummaryDto[] = [
  { category_id: "cat_food", name: "食費", color: "#ff6b7a", amount: 33450, ratio: 0.299 },
  { category_id: "cat_transport", name: "交通費", color: "#38a7e0", amount: 15200, ratio: 0.118 },
  { category_id: "cat_daily", name: "日用品", color: "#eea932", amount: 12100, ratio: 0.096 },
  { category_id: "cat_entertainment", name: "娯楽", color: "#9c72de", amount: 18600, ratio: 0.145 },
];

export const recentTransactions: TransactionDto[] = [
  {
    transaction_id: "txn_001",
    transaction_date: "2026-04-28",
    merchant_name: "セブン-イレブン",
    category_id: "cat_food",
    category_name: "食費",
    amount: 842,
    payment_method: "クレジットカード",
    memo: "朝食・おにぎり",
  },
  {
    transaction_id: "txn_002",
    transaction_date: "2026-04-27",
    merchant_name: "Amazon.co.jp",
    category_id: "cat_daily",
    category_name: "日用品",
    amount: 3200,
    payment_method: "クレジットカード",
    memo: "洗剤・日用品",
  },
  {
    transaction_id: "txn_003",
    transaction_date: "2026-04-27",
    merchant_name: "JR東日本",
    category_id: "cat_transport",
    category_name: "交通費",
    amount: 1320,
    payment_method: "Suica",
    memo: "通勤",
  },
  {
    transaction_id: "txn_004",
    transaction_date: "2026-04-25",
    merchant_name: "TOHOシネマズ",
    category_id: "cat_entertainment",
    category_name: "娯楽",
    amount: 2200,
    payment_method: "クレジットカード",
    memo: "映画",
  },
  {
    transaction_id: "txn_005",
    transaction_date: "2026-04-24",
    merchant_name: "成城石井",
    category_id: "cat_food",
    category_name: "食費",
    amount: 4280,
    payment_method: "デビットカード",
    memo: "夕食",
  },
];

export const uploadJobs: UploadJobDto[] = [
  {
    upload_job_id: "upload_001",
    file_name: "card-statement-2026-04.pdf",
    status: "completed",
    imported_transaction_count: 38,
    created_at: "2026-05-01 09:12",
  },
];
