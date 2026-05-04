import { describe, expect, it } from "vitest";
import { getTransactionCategoryDisplay } from "@/lib/transaction-category";

describe("getTransactionCategoryDisplay", () => {
  it("APIが返した表示用カテゴリを優先する", () => {
    expect(
      getTransactionCategoryDisplay({
        category_id: "inactive-food",
        display_category_id: "uncategorized",
        category_name: "未分類",
        category_color: "#6B7280",
      }),
    ).toEqual({
      category_id: "uncategorized",
      name: "未分類",
      color: "#6B7280",
    });
  });

  it("表示用カテゴリがない場合はfallbackカテゴリを使う", () => {
    expect(
      getTransactionCategoryDisplay(
        {
          category_id: "food",
          display_category_id: null,
          category_name: null,
          category_color: null,
        },
        {
          category_id: "food",
          name: "食費",
          color: "#ef4444",
        },
      ),
    ).toEqual({
      category_id: "food",
      name: "食費",
      color: "#ef4444",
    });
  });
});
