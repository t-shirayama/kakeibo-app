import { expect, test } from "@playwright/test";

test("shows monthly calendar and summaries", async ({ page }) => {
  await page.goto("/calendar");

  await expect(page.getByRole("heading", { name: "カレンダー" })).toBeVisible();
  await expect(page.getByLabel("表示月")).toHaveValue(/^\d{4}-\d{2}$/);
  await expect(page).toHaveURL(/month=\d{4}-\d{2}/);
  await expect(page.getByRole("heading", { name: "日別の支出カレンダー" })).toBeVisible();
  await expect(page.getByLabel("月間サマリー").getByText("収入", { exact: true })).toBeVisible();
  await expect(page.getByLabel("月間サマリー").getByText("支出", { exact: true })).toBeVisible();
  await expect(page.getByLabel("月間サマリー").getByText("収支", { exact: true })).toBeVisible();
  await expect(page.getByRole("gridcell", { name: /2026-05-05 祝日こどもの日/ })).toBeVisible();
});

test("shows selected day details and opens filtered transactions", async ({ page }) => {
  await page.goto("/calendar");
  await page.getByLabel("表示月").fill("2026-04");
  await expect(page).toHaveURL(/month=2026-04/);
  await page.reload();
  await expect(page.getByLabel("表示月")).toHaveValue("2026-04");
  await page.getByLabel("表示月").fill("2026-05");

  const mayFirstCell = page.getByRole("gridcell", { name: /2026-05-01/ });
  await mayFirstCell.click();

  await expect(page.getByRole("heading", { name: "選択日の明細" })).toBeVisible();
  await expect(page.getByLabel("選択日の明細一覧").getByText("成城石井")).toBeVisible();

  await page.getByRole("link", { name: "明細一覧で確認" }).click();

  await expect(page).toHaveURL(/\/transactions\?date_from=2026-05-01&date_to=2026-05-01$/);
  await expect(page.getByRole("heading", { name: "明細一覧" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "成城石井" })).toBeVisible();
});
