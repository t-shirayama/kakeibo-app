import { expect, type Page } from "@playwright/test";

export async function createTransaction(
  page: Page,
  values: { shopName: string; amount: string; category: string; transactionDate?: string; paymentMethod?: string },
) {
  await page.getByRole("button", { name: "手動で追加" }).click();
  await expect(page.getByRole("heading", { name: "明細を追加" })).toBeVisible();
  await page.getByLabel("日付").fill(values.transactionDate ?? "2026-05-02");
  await page.getByLabel("店名").fill(values.shopName);
  await page.getByLabel("カテゴリ", { exact: true }).selectOption({ label: values.category });
  await page.getByLabel("金額").fill(values.amount);
  await page.getByLabel("支払い方法").fill(values.paymentMethod ?? "現金");
  await page.getByRole("button", { name: "追加" }).click();
  await expect(page.getByRole("cell", { name: values.shopName }).first()).toBeVisible();
}

export async function setTransactionDateRange(page: Page, dateFrom: string, dateTo: string) {
  const dateFromInput = page.getByLabel("開始日");
  const dateToInput = page.getByLabel("終了日");

  await dateFromInput.fill(dateFrom);
  await expect(dateFromInput).toHaveValue(dateFrom);
  await dateToInput.fill(dateTo);
  await expect(dateToInput).toHaveValue(dateTo);
  await expect(page).toHaveURL(new RegExp(`date_from=${dateFrom}`));
  await expect(page).toHaveURL(new RegExp(`date_to=${dateTo}`));
}
