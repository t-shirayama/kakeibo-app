import { expect, test } from "@playwright/test";

test("shows upload history including completed and failed imports", async ({ page }) => {
  await page.goto("/upload");

  // 取込操作前でも、完了・失敗の履歴から状態と件数、失敗理由を確認できることを守る。
  await expect(page.getByRole("heading", { name: "アップロード", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "PDF明細をアップロード" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "取り込み履歴" })).toBeVisible();

  await expect(page.getByRole("cell", { name: "2026_04_楽天カード.pdf" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "2026_04_楽天カード.pdf" })).toContainText("完了");
  await expect(page.getByRole("row").filter({ hasText: "2026_04_楽天カード.pdf" })).toContainText("8件");

  const failedRow = page.getByRole("row").filter({ hasText: "2026_05_読み取り不可.pdf" });
  await expect(failedRow).toContainText("失敗");
  await expect(failedRow).toContainText("明細行を抽出できませんでした。");
});
