import { expect, test } from "@playwright/test";

test("shows dashboard metrics, category summary, and recent transactions", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: "ダッシュボード" })).toBeVisible();
  await expect(page.getByText("今月の支出合計")).toBeVisible();
  await expect(page.getByText("今月の収入合計")).toBeVisible();
  await expect(page.getByText("今月の残高")).toBeVisible();
  await expect(page.getByText("取引件数")).toBeVisible();
  await expect(page.getByRole("heading", { name: "カテゴリ別支出割合" })).toBeVisible();
  await expect(page.getByRole("img", { name: "カテゴリ別支出割合の円グラフ" })).toBeVisible();
  const foodLegend = page.locator(".category-pie-legend-row").filter({ hasText: "食費" });
  await expect(foodLegend).toBeVisible();
  await foodLegend.focus();
  await expect(foodLegend).toHaveClass(/active/);
  await expect(foodLegend).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".category-pie-highlight[data-active-category='cat_food']")).toBeVisible();
  await expect(page.getByRole("heading", { name: "最近の明細" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "成城石井" })).toBeVisible();
});
