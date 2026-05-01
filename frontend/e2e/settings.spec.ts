import { expect, test } from "@playwright/test";

test("shows, updates, and preserves destructive settings controls", async ({ page }) => {
  await page.goto("/settings");

  await expect(page.getByRole("heading", { name: "設定" })).toBeVisible();
  await expect(page.getByLabel("表示通貨")).toHaveValue("JPY");
  await expect(page.getByLabel("1ページあたりの件数")).toHaveValue("20");
  await expect(page.getByLabel("日付形式")).toHaveValue("yyyy/MM/dd");

  await page.getByLabel("1ページあたりの件数").selectOption("50");
  await page.getByLabel("日付形式").selectOption("yyyy-MM-dd");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page.getByText("保存しました。")).toBeVisible();

  await expect(page.getByRole("heading", { name: "全データ削除" })).toBeVisible();
  await expect(page.getByLabel("削除確認文字列")).toBeVisible();
  await expect(page.getByRole("button", { name: "全データを削除" })).toBeDisabled();
});
