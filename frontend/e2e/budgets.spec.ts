import { expect, test } from "@playwright/test";
import { addMonths, expectDisplayedMonth, moveDisplayedMonth } from "./helpers/date";
import { gotoAppPage } from "./helpers/navigation";

test("switches between budget settings and actuals views", async ({ page }) => {
  await gotoAppPage(page, "/budgets", "予算管理");

  await expect(page.getByRole("button", { name: "予算設定" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("カテゴリ別の予算設定")).toBeVisible();
  await expect(page.getByText("食費")).toBeVisible();
  await expect(page.getByRole("button", { name: "変更" }).first()).toBeVisible();

  await page.getByRole("button", { name: "予実確認" }).click();
  await expect(page.getByRole("button", { name: "予実確認" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(/予算(内です|は.*超過しています)/)).toBeVisible();
  await expect(page.getByLabel("カテゴリ別予算進捗").getByText("食費")).toBeVisible();
});

test("changes the budget actuals month and keeps the selected month after reload", async ({ page }) => {
  await gotoAppPage(page, "/budgets", "予算管理");
  await page.getByRole("button", { name: "予実確認" }).click();

  const monthInput = page.getByLabel("表示月");
  const currentValue = await monthInput.inputValue();
  const previousMonth = addMonths(currentValue, -1);

  await moveDisplayedMonth(page, "前月", previousMonth.value);
  await expect(page.getByText(`${previousMonth.year}年${previousMonth.month}月の予算進捗`)).toBeVisible();
  await page.reload();
  await expectDisplayedMonth(page, previousMonth.value);
});
