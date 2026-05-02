import { expect, test } from "@playwright/test";

test("shows monthly report and exports Excel", async ({ page }) => {
  await page.goto("/reports");

  await expect(page.getByRole("heading", { name: "レポート" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "月別収入・支出" })).toBeVisible();
  await expect(page.getByRole("img", { name: "月別収入支出グラフ" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "カテゴリ別サマリー" })).toBeVisible();
  await expect(page.getByText("食費")).toBeVisible();

  const downloadResponse = page.waitForResponse((response) =>
    response.url().includes("/api/transactions/export") && response.status() === 200,
  );
  await page.getByRole("button", { name: "Excel" }).click();
  await downloadResponse;
});
