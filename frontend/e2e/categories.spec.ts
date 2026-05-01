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
  await e2eRow.getByRole("button", { name: "E2Eカテゴリを編集" }).click();
  await expect(page.getByRole("heading", { name: "カテゴリを編集" })).toBeVisible();
  await page.getByLabel("カテゴリ名").fill("E2Eカテゴリ 編集済み");
  await page.getByLabel("説明").fill("編集後の説明");
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page.getByText("E2Eカテゴリ 編集済み")).toBeVisible();

  const editedRow = page.locator(".category-row").filter({ hasText: "E2Eカテゴリ 編集済み" });
  await editedRow.getByRole("button", { name: "無効化" }).click();
  await expect(editedRow).toContainText("無効");

  await editedRow.getByRole("button", { name: "有効化" }).click();
  await expect(editedRow).toContainText("有効");

  page.once("dialog", (dialog) => dialog.accept());
  await editedRow.getByRole("button", { name: "E2Eカテゴリ 編集済みを削除" }).click();
  await expect(page.getByText("E2Eカテゴリ 編集済み")).toHaveCount(0);
});
