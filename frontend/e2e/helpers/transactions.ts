import { expect, type Page } from "@playwright/test";

type TransactionFormValues = {
  transactionDate?: string;
  shopName?: string;
  category?: string;
  amount?: string;
  paymentMethod?: string;
  memo?: string;
};

export async function createTransaction(
  page: Page,
  values: { shopName: string; amount: string; category: string; transactionDate?: string; paymentMethod?: string },
) {
  await openTransactionCreateForm(page);
  await fillTransactionForm(page, {
    transactionDate: values.transactionDate ?? "2026-05-02",
    shopName: values.shopName,
    category: values.category,
    amount: values.amount,
    paymentMethod: values.paymentMethod ?? "現金",
  });
  await submitTransactionForm(page, "追加");
  await expect(page.getByRole("cell", { name: values.shopName }).first()).toBeVisible();
}

export async function createTransactions(
  page: Page,
  valuesList: Array<{ shopName: string; amount: string; category: string; transactionDate?: string; paymentMethod?: string }>,
) {
  for (const values of valuesList) {
    await createTransaction(page, values);
  }
}

export async function setTransactionDateRange(page: Page, dateFrom: string, dateTo: string) {
  const dateFromInput = page.getByLabel("開始日");
  const dateToInput = page.getByLabel("終了日");

  await dateFromInput.fill(dateFrom);
  await dateFromInput.press("Tab");
  await dateToInput.fill(dateTo);
  await dateToInput.press("Tab");
  await expect(page).toHaveURL(new RegExp(`date_from=${dateFrom}`));
  await expect(page).toHaveURL(new RegExp(`date_to=${dateTo}`));
  await expect(dateFromInput).toHaveValue(dateFrom);
  await expect(dateToInput).toHaveValue(dateTo);
}

export async function openTransactionCreateForm(page: Page) {
  await page.getByRole("button", { name: "手動で追加" }).click();
  await expect(page.getByRole("heading", { name: "明細を追加" })).toBeVisible();
}

export async function openTransactionEditForm(page: Page, rowText: string) {
  await page.getByRole("row").filter({ hasText: rowText }).first().getByRole("button", { name: "明細を編集" }).click();
  await expect(page.getByRole("heading", { name: "明細を編集" })).toBeVisible();
}

export async function fillTransactionForm(page: Page, values: TransactionFormValues) {
  if (values.transactionDate !== undefined) {
    await page.getByLabel("日付").fill(values.transactionDate);
  }
  if (values.shopName !== undefined) {
    await page.getByLabel("店名").fill(values.shopName);
  }
  if (values.category !== undefined) {
    await page.getByLabel("カテゴリ", { exact: true }).selectOption({ label: values.category });
  }
  if (values.amount !== undefined) {
    await page.getByLabel("金額").fill(values.amount);
  }
  if (values.paymentMethod !== undefined) {
    await page.getByLabel("支払い方法").fill(values.paymentMethod);
  }
  if (values.memo !== undefined) {
    await page.getByLabel("メモ").fill(values.memo);
  }
}

export async function submitTransactionForm(page: Page, actionName: "追加" | "保存") {
  await page.getByRole("button", { name: actionName }).click();
}

export async function deleteTransaction(page: Page, rowText: string) {
  await page.getByRole("row").filter({ hasText: rowText }).first().getByRole("button", { name: "明細を削除" }).click();
  await expect(page.getByRole("heading", { name: "この明細を削除しますか？" })).toBeVisible();
  await page.getByRole("button", { name: "削除する" }).click();
}
