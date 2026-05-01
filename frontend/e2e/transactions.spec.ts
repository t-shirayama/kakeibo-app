import { expect, test } from "@playwright/test";

test("searches, creates, edits, deletes, and exports transactions", async ({ page }) => {
  await page.goto("/transactions");

  await expect(page.getByRole("heading", { name: "明細一覧" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "成城石井" })).toBeVisible();

  await page.getByLabel("明細検索").fill("Amazon");
  await expect(page.getByRole("cell", { name: "Amazon.co.jp", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "成城石井" })).toHaveCount(0);

  await page.getByLabel("明細検索").fill("");
  await page.getByRole("button", { name: "手動で追加" }).click();
  await expect(page.getByRole("heading", { name: "明細を追加" })).toBeVisible();
  await page.getByLabel("日付").fill("2026-05-02");
  await page.getByLabel("店名").fill("E2Eテスト店舗");
  await page.getByLabel("カテゴリ").selectOption({ label: "食費" });
  await page.getByLabel("金額").fill("1234");
  await page.getByLabel("支払い方法").fill("現金");
  await page.getByLabel("メモ").fill("E2E追加");
  await page.getByRole("button", { name: "追加" }).click();

  await expect(page.getByRole("cell", { name: "E2Eテスト店舗" })).toBeVisible();

  const row = page.getByRole("row").filter({ hasText: "E2Eテスト店舗" });
  await row.getByRole("button", { name: "明細を編集" }).click();
  await expect(page.getByRole("heading", { name: "明細を編集" })).toBeVisible();
  await page.getByLabel("店名").fill("E2Eテスト店舗 編集済み");
  await page.getByLabel("金額").fill("2345");
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page.getByRole("cell", { name: "E2Eテスト店舗 編集済み" })).toBeVisible();

  const downloadResponse = page.waitForResponse((response) =>
    response.url().includes("/api/transactions/export") && response.status() === 200,
  );
  await page.getByRole("button", { name: "エクスポート" }).click();
  await downloadResponse;

  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("row")
    .filter({ hasText: "E2Eテスト店舗 編集済み" })
    .getByRole("button", { name: "明細を削除" })
    .click();

  await expect(page.getByRole("cell", { name: "E2Eテスト店舗 編集済み" })).toHaveCount(0);
});
