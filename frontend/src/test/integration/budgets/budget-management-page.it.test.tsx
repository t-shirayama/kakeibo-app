import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BudgetManagementPage } from "@/features/budgets/budget-management-page";
import { api } from "@/lib/api";
import { renderWithRoute, setupIntegrationUser } from "@/test/integration/helpers";
import { dashboardSummary, mockCategories } from "@/test/msw/fixtures";
import { getMockRouter, setMockUrl } from "@/test/navigation";

describe("BudgetManagementPage integration", () => {
  it("予算設定タブでカテゴリ別の月次予算を更新して一覧へ反映する", async () => {
    const user = setupIntegrationUser();
    const categories = mockCategories.map((category) => ({ ...category }));

    vi.spyOn(api, "list_categories").mockImplementation(async () => categories);
    vi.spyOn(api, "update_category").mockImplementation(async (categoryId, request) => {
      const target = categories.find((category) => category.category_id === categoryId);
      if (!target) {
        throw new Error("Category not found");
      }
      target.monthly_budget = request.monthly_budget ?? null;
      return target;
    });

    renderWithRoute(<BudgetManagementPage />, "/budgets?month=2026-05");

    expect(await screen.findByText("カテゴリ別の予算設定")).toBeInTheDocument();
    expect(await screen.findByText("￥40,000")).toBeInTheDocument();
    const foodCategoryRow = (await screen.findByText("食費")).closest(".budget-setting-row");
    expect(foodCategoryRow).not.toBeNull();
    await user.click(within(foodCategoryRow as HTMLElement).getByRole("button", { name: "変更" }));
    await user.clear(screen.getByLabelText("月次予算"));
    await user.type(screen.getByLabelText("月次予算"), "45000");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.getByText("￥45,000")).toBeInTheDocument());
    expect(screen.getByText("設定済みカテゴリ")).toBeInTheDocument();
  });

  it("予実確認タブで対象月の予算進捗を表示し、URLの月変更で再取得する", async () => {
    const requestedMonths: string[] = [];
    vi.spyOn(api, "get_dashboard_summary").mockImplementation(async (params) => {
      const year = params?.year ?? 2026;
      const month = params?.month ?? 5;
      requestedMonths.push(String(month));
      return dashboardSummary(`${year}-${String(month).padStart(2, "0")}`);
    });

    const view = renderWithRoute(<BudgetManagementPage />, "/budgets?month=2026-05");
    const user = setupIntegrationUser();
    await user.click(screen.getByRole("button", { name: "予実確認" }));
    await waitFor(() => expect(getMockRouter().replace).toHaveBeenCalledWith("/budgets?month=2026-05&tab=actuals"));
    view.rerender(<BudgetManagementPage />);

    expect(await screen.findByText("2026年5月の予算進捗")).toBeInTheDocument();
    expect(screen.getByText(/予算は.*800.*超過しています/)).toBeInTheDocument();
    expect(screen.getByText("交通費")).toBeInTheDocument();

    setMockUrl("/budgets?month=2026-04&tab=actuals");
    view.rerender(<BudgetManagementPage />);

    expect(await screen.findByText("2026年4月の予算進捗")).toBeInTheDocument();
    expect(requestedMonths).toEqual(expect.arrayContaining(["5", "4"]));
  });
});
