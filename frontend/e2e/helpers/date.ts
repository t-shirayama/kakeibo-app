import { expect, type Page } from "@playwright/test";

export function addMonths(value: string, amount: number) {
  const { year, month } = parseYearMonth(value);
  const date = new Date(year, month - 1 + amount, 1);
  const nextValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

  return {
    ...parseYearMonth(nextValue),
    value: nextValue,
    label: `${date.getFullYear()}年${date.getMonth() + 1}月`,
  };
}

export function parseYearMonth(value: string) {
  const [year, month] = value.split("-").map(Number);

  return { year, month };
}

export function getMonthDateRange(value: string) {
  const { year, month } = parseYearMonth(value);
  const lastDay = new Date(year, month, 0).getDate();
  const paddedMonth = String(month).padStart(2, "0");

  return {
    date_from: `${year}-${paddedMonth}-01`,
    date_to: `${year}-${paddedMonth}-${String(lastDay).padStart(2, "0")}`,
  };
}

export async function expectDisplayedMonth(page: Page, value: string) {
  await expect(page.getByLabel("表示月")).toHaveValue(value);
  await expect(page).toHaveURL(new RegExp(`month=${value}`));
}

export async function moveDisplayedMonth(page: Page, buttonName: "前月" | "翌月", expectedValue: string) {
  await page.getByRole("button", { name: buttonName }).click();
  await expectDisplayedMonth(page, expectedValue);
}
