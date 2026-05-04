import type { CategoryDto, TransactionDto } from "./types";

export type TransactionCategoryDisplay = {
  category_id: string;
  name: string;
  color: string;
};

const UNCATEGORIZED_DISPLAY = {
  category_id: "uncategorized",
  name: "未分類",
  color: "#6B7280",
} as const;

export function getTransactionCategoryDisplay(
  transaction: Pick<TransactionDto, "category_id" | "display_category_id" | "category_name" | "category_color">,
  fallbackCategory?: Pick<CategoryDto, "category_id" | "name" | "color">,
): TransactionCategoryDisplay {
  if (transaction.display_category_id && transaction.category_name && transaction.category_color) {
    return {
      category_id: transaction.display_category_id,
      name: transaction.category_name,
      color: transaction.category_color,
    };
  }

  if (transaction.category_name && transaction.category_color) {
    return {
      category_id: transaction.category_id,
      name: transaction.category_name,
      color: transaction.category_color,
    };
  }

  if (fallbackCategory) {
    return {
      category_id: fallbackCategory.category_id,
      name: fallbackCategory.name,
      color: fallbackCategory.color,
    };
  }

  return { ...UNCATEGORIZED_DISPLAY };
}
