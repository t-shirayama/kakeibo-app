import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CategoryRulesPage from "@/features/category-rules/category-rules-page";
import { api, type CategoryRuleRequest } from "@/lib/api";
import type { CategoryRuleDto } from "@/lib/types";
import { renderWithRoute, setupIntegrationUser } from "@/test/integration/helpers";
import { mockCategories, mockCategoryRules } from "@/test/msw/fixtures";

describe("CategoryRulesPage integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("分類ルールの追加、編集、有効切替、削除を一覧へ反映する", async () => {
    const user = setupIntegrationUser();
    const rules: CategoryRuleDto[] = mockCategoryRules.map((rule) => ({ ...rule }));

    vi.spyOn(api, "list_categories").mockResolvedValue(mockCategories);
    vi.spyOn(api, "list_category_rules").mockImplementation(async () => rules);
    vi.spyOn(api, "create_category_rule").mockImplementation(async (request: CategoryRuleRequest) => {
      const created = {
        rule_id: "rule-created",
        keyword: request.keyword.trim(),
        category_id: request.category_id,
        is_active: true,
      };
      rules.push(created);
      return created;
    });
    vi.spyOn(api, "update_category_rule").mockImplementation(async (ruleId, request) => {
      const target = rules.find((rule) => rule.rule_id === ruleId);
      if (!target) {
        throw new Error("Rule not found");
      }
      target.keyword = request.keyword.trim();
      target.category_id = request.category_id;
      return target;
    });
    vi.spyOn(api, "set_category_rule_active").mockImplementation(async (ruleId, isActive) => {
      const target = rules.find((rule) => rule.rule_id === ruleId);
      if (!target) {
        throw new Error("Rule not found");
      }
      target.is_active = isActive;
      return target;
    });
    vi.spyOn(api, "delete_category_rule").mockImplementation(async (ruleId) => {
      const index = rules.findIndex((rule) => rule.rule_id === ruleId);
      if (index >= 0) {
        rules.splice(index, 1);
      }
      return { status: "deleted" };
    });

    renderWithRoute(<CategoryRulesPage />, "/category-rules");

    expect(await screen.findByText("Amazon")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "ルールを追加" }));
    await user.clear(screen.getByLabelText("店名キーワード"));
    await user.type(screen.getByLabelText("店名キーワード"), "東京メトロ");
    await user.selectOptions(screen.getByLabelText("カテゴリ"), "cat-transport");
    await user.click(screen.getByRole("button", { name: "追加" }));

    expect(await screen.findByText("東京メトロ")).toBeInTheDocument();
    expect(screen.getByText("交通費へ分類")).toBeInTheDocument();

    const createdRow = screen.getByText("東京メトロ").closest(".category-row");
    expect(createdRow).not.toBeNull();
    await user.click(within(createdRow as HTMLElement).getByRole("button", { name: "東京メトロを編集" }));
    await user.clear(screen.getByLabelText("店名キーワード"));
    await user.type(screen.getByLabelText("店名キーワード"), "東京メトロ定期");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("東京メトロ定期")).toBeInTheDocument();

    const editedRow = screen.getByText("東京メトロ定期").closest(".category-row");
    expect(editedRow).not.toBeNull();
    await user.click(within(editedRow as HTMLElement).getByRole("button", { name: "無効化" }));
    await waitFor(() => expect(within(editedRow as HTMLElement).getByText("無効")).toBeInTheDocument());

    await user.click(within(editedRow as HTMLElement).getByRole("button", { name: "東京メトロ定期を削除" }));
    await user.click(await screen.findByRole("button", { name: "削除する" }));
    await waitFor(() => expect(screen.queryByText("東京メトロ定期")).not.toBeInTheDocument());
  });
});
