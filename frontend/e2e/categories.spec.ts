import { expect, test } from "@playwright/test";

test("shows category colors and creates a category", async ({ page }) => {
  await page.goto("/categories");

  await expect(page.getByRole("heading", { name: "カテゴリ管理" })).toBeVisible();
  await expect(page.getByText("食費")).toBeVisible();

  const foodRow = page.locator(".category-row").filter({ hasText: "食費" });
  await expect(foodRow.locator(".swatch")).toHaveCSS("background-color", "rgb(255, 107, 122)");

  await page.getByRole("button", { name: "カテゴリを追加" }).click();
  await expect(page.getByRole("heading", { name: "カテゴリを追加" })).toBeVisible();
  await page.getByLabel("カテゴリ名").fill("E2Eカテゴリ");
  await page.getByLabel("説明").fill("E2Eで追加したカテゴリ");
  await page.getByRole("button", { name: "追加" }).click();

  await expect(page.getByText("E2Eカテゴリ")).toBeVisible();

  const e2eRow = page.locator(".category-row").filter({ hasText: "E2Eカテゴリ" });
  await e2eRow.getByRole("button", { name: "無効化" }).click();
  await expect(e2eRow).toContainText("無効");

  await e2eRow.getByRole("button", { name: "有効化" }).click();
  await expect(e2eRow).toContainText("有効");

  page.once("dialog", (dialog) => dialog.accept());
  await e2eRow.getByRole("button", { name: "E2Eカテゴリを削除" }).click();
  await expect(page.getByText("E2Eカテゴリ")).toHaveCount(0);
});
