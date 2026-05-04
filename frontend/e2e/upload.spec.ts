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
  await expect(page.getByText("直近の失敗: 2026_05_読み取り不可.pdf")).toBeVisible();
  await expect(page.getByRole("button", { name: "ファイルを選び直して再試行" })).toBeVisible();
});

test("uploads a PDF by dropping it onto the upload zone", async ({ page }) => {
  await page.goto("/upload");
  await expect(page.getByRole("heading", { name: "PDF明細をアップロード" })).toBeVisible();

  const uploadResponse = page.waitForResponse((response) =>
    response.url().includes("/api/uploads") && response.request().method() === "POST",
  );

  await page.getByLabel("PDFファイルのドロップゾーン").dispatchEvent("drop", {
    dataTransfer: await page.evaluateHandle(() => {
      const dataTransfer = new DataTransfer();
      const content = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
      dataTransfer.items.add(new File([content], "e2e-drop-test.pdf", { type: "application/pdf" }));
      return dataTransfer;
    }),
  });

  await expect(page.getByLabel("アップロード進捗")).toBeVisible();
  await expect(page.getByText("e2e-drop-test.pdf")).toBeVisible();
  await uploadResponse;
  await expect(page.getByRole("row").filter({ hasText: "e2e-drop-test.pdf" })).toBeVisible();
});
