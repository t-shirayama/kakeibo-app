import { expect, test } from "@playwright/test";
import { gotoAppPage } from "./helpers/navigation";
import { expectUploadHistoryRow, uploadPdfAndWaitForHistory } from "./helpers/upload";

test("shows upload history including completed and failed imports", async ({ page }) => {
  await gotoAppPage(page, "/upload", "アップロード");

  // 取込操作前でも、完了・失敗の履歴から状態と件数、失敗理由を確認できることを守る。
  await expect(page.getByRole("heading", { name: "PDF明細をアップロード" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "取り込み履歴" })).toBeVisible();

  await expectUploadHistoryRow(page, "2026_04_楽天カード.pdf", { status: "完了", importedCount: "8件" });
  await expectUploadHistoryRow(page, "2026_05_読み取り不可.pdf", {
    status: "失敗",
    errorMessage: "明細行を抽出できませんでした。",
  });
  await expect(page.getByText("直近の失敗: 2026_05_読み取り不可.pdf")).toBeVisible();
  await expect(page.getByRole("button", { name: "ファイルを選び直して再試行" })).toBeVisible();
});

test("uploads a PDF by dropping it onto the upload zone", async ({ page }) => {
  await gotoAppPage(page, "/upload", "アップロード");
  await expect(page.getByRole("heading", { name: "PDF明細をアップロード" })).toBeVisible();
  await uploadPdfAndWaitForHistory(page, "e2e-drop-test.pdf");
});
