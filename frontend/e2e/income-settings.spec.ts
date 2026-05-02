import { expect, test } from "@playwright/test";

test("creates and updates monthly income settings", async ({ page }) => {
  await page.goto("/income-settings");
  await expect(page.getByRole("heading", { name: "収入設定" })).toBeVisible();

  await page.getByLabel("対象").fill("E2E収入");
  await page.getByLabel("毎月の金額").fill("345000");
  await page.getByLabel("発生日").fill("25");
  await page.getByRole("button", { name: "追加" }).click();

  const row = page.locator(".income-setting-row").filter({ hasText: "E2E収入" });
  await expect(row).toBeVisible();
  await row.getByLabel("E2E収入の月別金額").fill("365000");
  await row.getByLabel("E2E収入の月別発生日").fill("20");
  await row.getByRole("button", { name: "月別変更を保存" }).click();
  await expect(row.getByText("365,000")).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("button", { name: "E2E収入を削除" }).click();
  await expect(row).toHaveCount(0);
});
