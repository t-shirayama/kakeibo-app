import { expect, test } from "@playwright/test";

test("shows dashboard metrics, category summary, and recent transactions", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: "ダッシュボード" })).toBeVisible();
  await expect(page.getByLabel("表示月")).toHaveValue(/^\d{4}-\d{2}$/);
  await expect(page.locator(".month-input-label span", { hasText: "表示月" })).toHaveClass(/sr-only/);
  await expect(page.getByText("今月の支出合計")).toBeVisible();
  await expect(page.getByText("今月の収入合計")).toBeVisible();
  await expect(page.getByText("今月の残高")).toBeVisible();
  await expect(page.getByText("取引件数")).toBeVisible();
  await expect(page.getByLabel(/前月比 (上昇|下降|変化なし)/).first()).toBeVisible();
  await expect(page.locator(".metric-delta-icon").first()).toBeVisible();
  await expect(page.locator(".metric-delta.good, .metric-delta.bad").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "カテゴリ別支出割合" })).toBeVisible();
  await expect(page.getByRole("img", { name: "カテゴリ別支出割合の円グラフ" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "支出の推移" })).toBeVisible();
  await expect(page.getByRole("img", { name: "直近6ヶ月の月別収入支出グラフ" })).toBeVisible();
  await expect(page.getByLabel("グラフ凡例").getByText("収入", { exact: true })).toBeVisible();
  await expect(page.getByLabel("グラフ凡例").getByText("支出", { exact: true })).toBeVisible();
  await expect(page.getByLabel("グラフ凡例").getByText("平均支出", { exact: true })).toBeVisible();
  await expect(page.locator(".chart-average-line")).toBeVisible();
  await expectCategoryAmountsToBeDescending(page);
  const foodLegend = page.locator(".category-pie-legend-row").filter({ hasText: "食費" });
  await expect(foodLegend).toBeVisible();
  await foodLegend.focus();
  await expect(foodLegend).toHaveClass(/active/);
  await expect(foodLegend).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".category-pie-highlight")).toBeVisible();
  await expect(page.getByRole("heading", { name: "最近の明細" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "成城石井" })).toBeVisible();
});

test("changes dashboard month with month picker and arrow buttons", async ({ page }) => {
  await page.goto("/dashboard");

  const monthInput = page.getByLabel("表示月");
  const currentValue = await monthInput.inputValue();
  const pickerMonth = addMonths(currentValue, -2);
  const pickerRequest = page.waitForRequest((request) => matchesDashboardSummaryRequest(request.url(), pickerMonth));

  await monthInput.fill(pickerMonth.value);
  await pickerRequest;

  await expect(monthInput).toHaveValue(pickerMonth.value);
  await expect(page.getByText(`${pickerMonth.label}の支出合計`)).toBeVisible();

  const nextMonth = addMonths(pickerMonth.value, 1);
  const nextRequest = page.waitForRequest((request) => matchesDashboardSummaryRequest(request.url(), nextMonth));

  await page.getByRole("button", { name: "翌月" }).click();
  await nextRequest;

  await expect(monthInput).toHaveValue(nextMonth.value);
  await expect(page.getByText(`${nextMonth.label}の支出合計`)).toBeVisible();

  await page.getByRole("button", { name: "前月" }).click();

  await expect(monthInput).toHaveValue(pickerMonth.value);
  await expect(page.getByText(`${pickerMonth.label}の支出合計`)).toBeVisible();
});

test("opens transactions filtered by selected month and category from category summary", async ({ page }) => {
  await page.goto("/dashboard");

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
  await expect(page.getByRole("cell", { name: "成城石井" })).toBeVisible();
});

function matchesDashboardSummaryRequest(url: string, target: { year: number; month: number }) {
  const parsedUrl = new URL(url);

  return parsedUrl.pathname.endsWith("/api/dashboard/summary") && parsedUrl.searchParams.get("year") === String(target.year) && parsedUrl.searchParams.get("month") === String(target.month);
}

function addMonths(value: string, amount: number) {
  const { year, month } = parseYearMonth(value);
  const date = new Date(year, month - 1 + amount, 1);
  const nextValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

  return {
    ...parseYearMonth(nextValue),
    value: nextValue,
    label: `${date.getFullYear()}年${date.getMonth() + 1}月`,
  };
}

function parseYearMonth(value: string) {
  const [year, month] = value.split("-").map(Number);

  return { year, month };
}

function getMonthDateRange(value: string) {
  const { year, month } = parseYearMonth(value);
  const lastDay = new Date(year, month, 0).getDate();
  const paddedMonth = String(month).padStart(2, "0");

  return {
    date_from: `${year}-${paddedMonth}-01`,
    date_to: `${year}-${paddedMonth}-${String(lastDay).padStart(2, "0")}`,
  };
}

async function expectCategoryAmountsToBeDescending(page: import("@playwright/test").Page) {
  const amounts = await page.locator(".category-pie-legend-row .amount").evaluateAll((nodes) =>
    nodes.map((node) => Number((node.textContent ?? "").replace(/[^\d.-]/g, ""))),
  );

  expect(amounts.length).toBeGreaterThan(1);
  for (let index = 1; index < amounts.length; index += 1) {
    expect(amounts[index - 1]).toBeGreaterThanOrEqual(amounts[index]);
  }
}
