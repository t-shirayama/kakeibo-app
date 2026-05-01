import type { CategoryDto, CategorySummaryDto, TransactionDto, UploadJobDto } from "./types";

export const categories: CategoryDto[] = [
  {
    category_id: "cat_food",
    name: "食費",
    color: "#ff6b7a",
    description: "スーパー、コンビニ、カフェ",
    is_active: true,
  },
  {
    category_id: "cat_daily",
    name: "日用品",
    color: "#eea932",
    description: "Amazon、ドラッグストア",
    is_active: true,
  },
  {
    category_id: "cat_transport",
    name: "交通費",
    color: "#38a7e0",
    description: "JR、Suica、地下鉄",
    is_active: true,
  },
  {
    category_id: "cat_entertainment",
    name: "娯楽",
    color: "#9c72de",
    description: "映画、配信、書籍",
    is_active: true,
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
    shop_name: "セブン-イレブン",
    category_id: "cat_food",
    category_name: "食費",
    amount: 842,
    transaction_type: "expense",
    payment_method: "クレジットカード",
    memo: "朝食・おにぎり",
  },
  {
    transaction_id: "txn_002",
    transaction_date: "2026-04-27",
    shop_name: "Amazon.co.jp",
    category_id: "cat_daily",
    category_name: "日用品",
    amount: 3200,
    transaction_type: "expense",
    payment_method: "クレジットカード",
    memo: "洗剤・日用品",
  },
  {
    transaction_id: "txn_003",
    transaction_date: "2026-04-27",
    shop_name: "JR東日本",
    category_id: "cat_transport",
    category_name: "交通費",
    amount: 1320,
    transaction_type: "expense",
    payment_method: "Suica",
    memo: "通勤",
  },
  {
    transaction_id: "txn_004",
    transaction_date: "2026-04-25",
    shop_name: "TOHOシネマズ",
    category_id: "cat_entertainment",
    category_name: "娯楽",
    amount: 2200,
    transaction_type: "expense",
    payment_method: "クレジットカード",
    memo: "映画",
  },
  {
    transaction_id: "txn_005",
    transaction_date: "2026-04-24",
    shop_name: "成城石井",
    category_id: "cat_food",
    category_name: "食費",
    amount: 4280,
    transaction_type: "expense",
    payment_method: "デビットカード",
    memo: "夕食",
  },
];

export const uploadJobs: UploadJobDto[] = [
  {
    upload_id: "upload_001",
    file_name: "card-statement-2026-04.pdf",
    stored_file_path: "storage/uploads/demo/upload_001/original.pdf",
    status: "completed",
    imported_count: 38,
    error_message: null,
    uploaded_at: "2026-05-01 09:12",
  },
];
