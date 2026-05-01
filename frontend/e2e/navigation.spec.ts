import { expect, test } from "@playwright/test";

const routes = [
  ["ダッシュボード", "/dashboard"],
  ["明細一覧", "/transactions"],
  ["アップロード", "/upload"],
  ["カテゴリ管理", "/categories"],
  ["レポート", "/reports"],
  ["設定", "/settings"],
] as const;

test("navigates between all primary screens from the sidebar", async ({ page }) => {
  await page.goto("/dashboard");

  for (const [label, path] of routes) {
    await page.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { name: label, exact: true })).toBeVisible();
  }
});
