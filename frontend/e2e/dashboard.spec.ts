import { expect, test } from "@playwright/test";
import { addMonths, expectDisplayedMonth, getMonthDateRange, moveDisplayedMonth } from "./helpers/date";
import { gotoAppPage } from "./helpers/navigation";

test("shows integrated report dashboard metrics, charts, and export action", async ({ page }) => {
  await gotoAppPage(page, "/dashboard", "ダッシュボード");

  await expect(page.getByLabel("表示月")).toHaveValue(/^\d{4}-\d{2}$/);
  await expect(page.getByLabel("表示月")).toHaveAttribute("type", "month");
  await expect(page).toHaveURL(/month=\d{4}-\d{2}/);
  await expect(page.locator(".month-input-label span", { hasText: "表示月" })).toHaveClass(/sr-only/);
  const summarySection = page.getByLabel("家計サマリー");
  await expect(summarySection.getByText("収入", { exact: true })).toBeVisible();
  await expect(summarySection.getByText("支出", { exact: true })).toBeVisible();
  await expect(summarySection.getByText("収支", { exact: true })).toBeVisible();
  await expect(summarySection.getByText("貯蓄率", { exact: true })).toBeVisible();
  await expect(page.locator(".summary-card-delta.good, .summary-card-delta.bad, .summary-card-delta.neutral").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Excel" })).toBeVisible();
  await expect(page.getByRole("button", { name: "期間をカスタマイズ" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "カテゴリ別支出の割合" })).toBeVisible();
  await expect(page.getByRole("img", { name: "カテゴリ別支出割合の円グラフ" })).toBeVisible();
  const categoryLegend = page.getByLabel("カテゴリ別支出割合のカテゴリ一覧");
  await expect(categoryLegend).toBeVisible();
  await expect(categoryLegend).toHaveCSS("overflow-y", "auto");
  await expect(page.getByRole("heading", { name: "支出の推移" })).toBeVisible();
  await expect(page.getByRole("img", { name: "直近6ヶ月の支出推移グラフ" })).toBeVisible();
  await expect(page.getByLabel("グラフ凡例").getByText("収入", { exact: true })).toBeVisible();
  await expect(page.getByLabel("グラフ凡例").getByText("支出", { exact: true })).toBeVisible();
  await expect(page.getByLabel("グラフ凡例").getByText("平均支出", { exact: true })).toBeVisible();
  await expect(page.locator(".chart-average-line")).toBeVisible();
  await expect(page.getByRole("heading", { name: "今月の気づき" })).toBeVisible();
  await expect(page.locator(".insight-card")).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "カテゴリ別支出（前月比）" })).toBeVisible();
  await expectCategoryAmountsToBeDescending(page);
  const foodLegend = page.locator(".category-pie-legend-row").filter({ hasText: "食費" });
  await expect(foodLegend).toBeVisible();
  const legendMetrics = await categoryLegend.evaluate((node) => {
    const style = window.getComputedStyle(node);
    return {
      clientHeight: node.clientHeight,
      maxHeight: style.maxHeight,
    };
  });
  expect(legendMetrics.clientHeight).toBeGreaterThan(0);
  expect(legendMetrics.maxHeight).not.toBe("none");
  await foodLegend.focus();
  await expect(foodLegend).toHaveClass(/active/);
  await expect(foodLegend).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".category-pie-highlight")).toBeVisible();
  await expect(page.getByRole("cell", { name: "食費" })).toBeVisible();

  const exportRequest = page.waitForRequest((request) =>
    request.url().includes("/api/transactions/export") && request.method() === "GET",
  );
  await page.getByRole("button", { name: "Excel" }).click();
  await exportRequest;
});

test("changes dashboard month with month picker and arrow buttons", async ({ page }) => {
  await gotoAppPage(page, "/dashboard", "ダッシュボード");

  const monthInput = page.getByLabel("表示月");
  const currentValue = await monthInput.inputValue();
  const previousMonth = addMonths(currentValue, -1);
  const pickerMonth = addMonths(currentValue, -2);

  await moveDisplayedMonth(page, "前月", previousMonth.value);
  await moveDisplayedMonth(page, "前月", pickerMonth.value);
  await expect(page.getByText(`${pickerMonth.label}までの直近6ヶ月`)).toBeVisible();
  await expect(page.getByRole("img", { name: "直近6ヶ月の支出推移グラフ" })).toBeVisible();

  const nextMonth = addMonths(pickerMonth.value, 1);
  await page.route("**/api/dashboard/summary?**", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("month") === String(nextMonth.month)) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    await route.continue();
  });

  await moveDisplayedMonth(page, "翌月", nextMonth.value);
  await expect(page.getByRole("img", { name: "直近6ヶ月の支出推移グラフ" })).toBeVisible();
  await expect(page.getByText("データを取得しています。")).toHaveCount(0);
  await expect(page.getByText(`${nextMonth.label}までの直近6ヶ月`)).toBeVisible();

  await moveDisplayedMonth(page, "前月", pickerMonth.value);
  await expect(page.getByText(`${pickerMonth.label}までの直近6ヶ月`)).toBeVisible();
  await page.reload();
  await expectDisplayedMonth(page, pickerMonth.value);
});

test("opens transactions filtered by selected month and category from category summary", async ({ page }) => {
  await gotoAppPage(page, "/dashboard", "ダッシュボード");

  const selectedMonth = await page.getByLabel("表示月").inputValue();
  const expectedRange = getMonthDateRange(selectedMonth);
  const foodLegend = page.locator(".category-pie-legend-row").filter({ hasText: "食費" });
  await expect(foodLegend).toBeVisible();

  await foodLegend.click();

  await expect(page).toHaveURL(/\/transactions/);
  const url = new URL(page.url());
  expect(url.searchParams.get("date_from")).toBe(expectedRange.date_from);
  expect(url.searchParams.get("date_to")).toBe(expectedRange.date_to);
  expect(url.searchParams.get("category_id")).toBeTruthy();
  await expect(page.getByRole("heading", { name: "明細一覧" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "成城石井" })).toBeVisible();
});

test("keeps category legend scrolling inside the dashboard panel", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 640 });
  await gotoAppPage(page, "/dashboard", "ダッシュボード");

  const legend = page.getByLabel("カテゴリ別支出割合のカテゴリ一覧");
  await expect(legend).toBeVisible();

  const metricsBefore = await legend.evaluate((node) => ({
    clientHeight: node.clientHeight,
    scrollHeight: node.scrollHeight,
    scrollTop: node.scrollTop,
  }));
  expect(metricsBefore.scrollHeight).toBeGreaterThan(metricsBefore.clientHeight);

  const mainScrollBefore = await page.locator(".main").evaluate((node) => node.scrollTop);
  await legend.evaluate((node) => {
    node.scrollTop += 360;
  });

  await expect.poll(async () => legend.evaluate((node) => node.scrollTop)).toBeGreaterThan(metricsBefore.scrollTop);
  await expect(page.locator(".main")).toHaveJSProperty("scrollTop", mainScrollBefore);
});

test("keeps the march dashboard within the main viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await gotoAppPage(page, "/dashboard?month=2026-03", "ダッシュボード");

  const mainScroll = await page.locator(".main").evaluate((node) => ({
    clientHeight: node.clientHeight,
    scrollHeight: node.scrollHeight,
  }));
  expect(mainScroll.scrollHeight).toBeLessThanOrEqual(mainScroll.clientHeight + 1);

  const comparisonWrap = page.locator(".dashboard-comparison-table-wrap");
  const comparisonMetrics = await comparisonWrap.evaluate((node) => ({
    clientHeight: node.clientHeight,
    scrollHeight: node.scrollHeight,
  }));
  expect(comparisonMetrics.scrollHeight).toBeGreaterThan(comparisonMetrics.clientHeight);
});

async function expectCategoryAmountsToBeDescending(page: import("@playwright/test").Page) {
  const amounts = await page.locator(".category-pie-legend-row .amount").evaluateAll((nodes) =>
    nodes.map((node) => Number((node.textContent ?? "").replace(/[^\d.-]/g, ""))),
  );

  expect(amounts.length).toBeGreaterThan(1);
  for (let index = 1; index < amounts.length; index += 1) {
    expect(amounts[index - 1]).toBeGreaterThanOrEqual(amounts[index]);
  }
}
