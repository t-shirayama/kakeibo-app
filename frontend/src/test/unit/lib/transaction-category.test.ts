import { describe, expect, it } from "vitest";
import { getTransactionCategoryDisplay } from "@/lib/transaction-category";

function makeTransactionCategoryDisplayInput(overrides: Partial<Parameters<typeof getTransactionCategoryDisplay>[0]> = {}) {
  return {
    category_id: "food",
    display_category_id: null,
    category_name: null,
    category_color: null,
    ...overrides,
  };
}

describe("getTransactionCategoryDisplay", () => {
  it("APIが返した表示用カテゴリを優先する", () => {
    expect(
      getTransactionCategoryDisplay(
        makeTransactionCategoryDisplayInput({
          category_id: "inactive-food",
          display_category_id: "uncategorized",
          category_name: "未分類",
          category_color: "#6B7280",
        }),
      ),
    ).toEqual({
      category_id: "uncategorized",
      name: "未分類",
      color: "#6B7280",
    });
  });

  it("表示用カテゴリがない場合はfallbackカテゴリを使う", () => {
    expect(
      getTransactionCategoryDisplay(
        makeTransactionCategoryDisplayInput(),
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

  it("表示用カテゴリIDがなくてもカテゴリ名と色があれば元カテゴリを表示する", () => {
    expect(
      getTransactionCategoryDisplay(
        makeTransactionCategoryDisplayInput({
          category_name: "食費",
          category_color: "#ef4444",
        }),
      ),
    ).toEqual({
      category_id: "food",
      name: "食費",
      color: "#ef4444",
    });
  });

  it("fallbackもない場合は未分類表示へ寄せる", () => {
    expect(getTransactionCategoryDisplay(makeTransactionCategoryDisplayInput())).toEqual({
      category_id: "uncategorized",
      name: "未分類",
      color: "#6B7280",
    });
  });
});
