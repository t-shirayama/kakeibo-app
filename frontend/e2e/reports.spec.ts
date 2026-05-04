import { expect, test } from "@playwright/test";

test("redirects legacy reports route to dashboard and keeps export available", async ({ page }) => {
  await page.goto("/reports");

  await expect(page.getByRole("heading", { name: "レポート" })).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "カテゴリ別支出の割合" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Excel" })).toBeVisible();
});
