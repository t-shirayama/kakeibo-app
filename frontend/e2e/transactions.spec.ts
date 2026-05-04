import { expect, test } from "@playwright/test";

test("searches, creates, edits, deletes, and exports transactions", async ({ page }) => {
  await page.goto("/transactions");

  // 初期表示は今月の明細に絞られるため、今月・先月の切り替えをまず確認する。
  await expect(page.getByRole("heading", { name: "明細一覧" })).toBeVisible();
  await expect(page.getByLabel("適用中のフィルタ").getByText("今月")).toBeVisible();
  await expect(page.getByText(/件ヒット/)).toBeVisible();
  await expect(page.getByText("検索対象: 店名 / メモ / カテゴリ")).toBeVisible();
  await expect(page.getByText("ソート: 日付 降順")).toBeVisible();
  await expect(page.getByText(/1ページ (10|20|50)件/)).toBeVisible();
  await expect(page.getByRole("cell", { name: "成城石井" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Amazon.co.jp", exact: true })).toHaveCount(0);
  await expect(page.locator(".transaction-amount.expense").first()).toBeVisible();
  await expect(page).toHaveURL(/page=1/);
  await expect(page).toHaveURL(/page_size=(10|20|50)/);
  await expect(page).toHaveURL(/sort_field=date/);
  await expect(page).toHaveURL(/sort_direction=desc/);

  await page.getByLabel("開始日").fill("2026-04-01");
  await page.getByLabel("終了日").fill("2026-04-30");
  await expect(page).toHaveURL(/date_from=2026-04-01/);
  await expect(page).toHaveURL(/date_to=2026-04-30/);
  await expect(page.getByRole("cell", { name: "Amazon.co.jp", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "成城石井" })).toHaveCount(0);
  await expect(page.getByLabel("適用中のフィルタ").getByText("2026-04-01 - 2026-04-30")).toBeVisible();

  await page.getByLabel("開始日").fill("2026-01-01");
  await page.getByLabel("終了日").fill("2026-12-31");
  await page.getByLabel("カテゴリ絞り込み").selectOption({ label: "日用品" });
  await expect(page).toHaveURL(/date_from=2026-01-01/);
  await expect(page).toHaveURL(/date_to=2026-12-31/);
  await expect(page.getByRole("cell", { name: "Amazon.co.jp", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "成城石井" })).toHaveCount(0);
  await expect(page.getByLabel("適用中のフィルタ").getByText("日用品")).toBeVisible();
  const amazonRow = page.getByRole("row").filter({ hasText: "Amazon.co.jp" }).first();
  await amazonRow.focus();
  await expect(amazonRow).toBeFocused();
  await expect(amazonRow.locator("td").first()).toHaveCSS("background-color", "rgb(244, 249, 255)");

  await page.getByLabel("カテゴリ絞り込み").selectOption({ label: "すべてのカテゴリ" });
  await page.getByLabel("明細検索").fill("Amazon");
  await expect(page).toHaveURL(/keyword=Amazon/);
  await expect(page.locator('datalist#transaction-search-suggestions option[value="Amazon.co.jp"]')).toHaveCount(1);
  await expect(page.getByRole("cell", { name: "Amazon.co.jp", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "成城石井" })).toHaveCount(0);
  await expect(page.getByLabel("適用中のフィルタ").getByText("検索: Amazon")).toBeVisible();

  await page.getByRole("button", { name: /取引額でソート/ }).click();
  await expect(page.getByText("ソート: 金額 昇順")).toBeVisible();
  await page.getByRole("button", { name: /取引額でソート/ }).click();
  await expect(page.getByText("ソート: 金額 降順")).toBeVisible();
  await expect(page).toHaveURL(/sort_field=amount/);
  await expect(page).toHaveURL(/sort_direction=desc/);

  await page.getByLabel("明細検索").fill("");
  await page.getByRole("button", { name: "フィルタ解除" }).click();
  await page.getByLabel("開始日").fill("2025-12-01");
  await page.getByLabel("終了日").fill("2025-12-31");
  await page.getByLabel("カテゴリ絞り込み").selectOption({ label: "未分類" });
  await expect(page).toHaveURL(/date_from=2025-12-01/);
  await expect(page).toHaveURL(/date_to=2025-12-31/);
  await expect(page.getByRole("cell", { name: "名称未確定の取引" })).toBeVisible();

  // 未分類は検索語としても使えるため、カテゴリ名補完込みで検索対象に入ることを守る。
  await page.getByLabel("明細検索").fill("未分類");
  await expect(page.getByRole("cell", { name: "名称未確定の取引" })).toBeVisible();

  await page.getByRole("button", { name: "フィルタ解除" }).click();
  await expect(page).not.toHaveURL(/keyword=/);
  await page.getByLabel("開始日").fill("2026-01-01");
  await page.getByLabel("終了日").fill("2026-12-31");
  await page.getByLabel("カテゴリ絞り込み").selectOption({ label: "すべてのカテゴリ" });
  await expect(page).toHaveURL(/date_from=2026-01-01/);
  await expect(page).toHaveURL(/date_to=2026-12-31/);
  await expect(page.getByLabel("適用中のフィルタ").getByText("2026-01-01 - 2026-12-31")).toBeVisible();
  await page.getByRole("button", { name: "手動で追加" }).click();
  await expect(page.getByRole("heading", { name: "明細を追加" })).toBeVisible();
  await page.getByLabel("日付").fill("2026-05-02");
  await page.getByLabel("店名").fill("E2Eテスト店舗");
  await page.getByLabel("カテゴリ", { exact: true }).selectOption({ label: "食費" });
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

  // ブラウザの保存先に依存しないよう、Excel APIの成功レスポンスまでを検証する。
  await page.getByLabel("明細検索").fill("Amazon");
  await expect(page).toHaveURL(/keyword=Amazon/);
  await expect(page.getByRole("cell", { name: "Amazon.co.jp", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("明細検索")).toHaveValue("Amazon");
  await expect(page.getByRole("cell", { name: "Amazon.co.jp", exact: true })).toBeVisible();
  const downloadResponse = page.waitForResponse((response) =>
    response.url().includes("/api/transactions/export") && response.status() === 200,
  );
  await page.getByRole("button", { name: "エクスポート" }).click();
  const exportResponse = await downloadResponse;
  expect(exportResponse.url()).toContain("keyword=Amazon");
  expect(exportResponse.url()).toContain("date_from=2026-01-01");
  expect(exportResponse.url()).toContain("date_to=2026-12-31");
  await page.getByLabel("明細検索").fill("");
  await expect(page.getByRole("cell", { name: "E2Eテスト店舗 編集済み" })).toBeVisible();

  await page
    .getByRole("row")
    .filter({ hasText: "E2Eテスト店舗 編集済み" })
    .getByRole("button", { name: "明細を削除" })
    .click();
  await expect(page.getByRole("heading", { name: "この明細を削除しますか？" })).toBeVisible();
  await page.getByRole("button", { name: "削除する" }).click();

  await expect(page.getByRole("cell", { name: "E2Eテスト店舗 編集済み" })).toHaveCount(0);
});

test("asks whether to update categories for the same shop name", async ({ page }) => {
  await page.goto("/transactions");
  await page.getByLabel("開始日").fill("2026-01-01");
  await page.getByLabel("終了日").fill("2026-12-31");
  await page.getByLabel("カテゴリ絞り込み").selectOption({ label: "すべてのカテゴリ" });

  await createTransaction(page, { shopName: "E2E一括店舗", amount: "1111", category: "食費" });
  await createTransaction(page, { shopName: "E2E一括店舗", amount: "2222", category: "食費" });

  const bulkRows = page.getByRole("row").filter({ hasText: "E2E一括店舗" });
  await expect(bulkRows).toHaveCount(2);
  await bulkRows.first().getByRole("button", { name: "明細を編集" }).click();
  await page.getByLabel("カテゴリ", { exact: true }).selectOption({ label: "日用品" });
  await page.getByRole("button", { name: "保存" }).click();
  const bulkDialog = page.getByRole("dialog").filter({ hasText: "同じ店名の明細を一括更新しますか？" });
  await expect(bulkDialog.getByRole("heading", { name: "同じ店名の明細を一括更新しますか？" })).toBeVisible();
  await bulkDialog.getByRole("button", { name: "一括更新する" }).click();
  await expect(page.getByRole("row").filter({ hasText: "E2E一括店舗" }).filter({ hasText: "日用品" })).toHaveCount(2);

  await createTransaction(page, { shopName: "E2E単独店舗", amount: "3333", category: "食費" });
  await createTransaction(page, { shopName: "E2E単独店舗", amount: "4444", category: "食費" });

  const singleRows = page.getByRole("row").filter({ hasText: "E2E単独店舗" });
  await expect(singleRows).toHaveCount(2);
  await singleRows.first().getByRole("button", { name: "明細を編集" }).click();
  await page.getByLabel("カテゴリ", { exact: true }).selectOption({ label: "日用品" });
  await page.getByRole("button", { name: "保存" }).click();
  const cancelDialog = page.getByRole("dialog").filter({ hasText: "同じ店名の明細を一括更新しますか？" });
  await expect(cancelDialog.getByRole("heading", { name: "同じ店名の明細を一括更新しますか？" })).toBeVisible();
  await cancelDialog.getByRole("button", { name: "キャンセル" }).click();
  await expect(page.getByRole("heading", { name: "明細を編集" })).toBeVisible();
  await page.getByRole("button", { name: "閉じる" }).click();
  await expect(page.getByRole("row").filter({ hasText: "E2E単独店舗" }).filter({ hasText: "食費" })).toHaveCount(2);
  await expect(page.getByRole("row").filter({ hasText: "E2E単独店舗" }).filter({ hasText: "日用品" })).toHaveCount(0);
});

async function createTransaction(
  page: import("@playwright/test").Page,
  values: { shopName: string; amount: string; category: string },
) {
  await page.getByRole("button", { name: "手動で追加" }).click();
  await expect(page.getByRole("heading", { name: "明細を追加" })).toBeVisible();
  await page.getByLabel("日付").fill("2026-05-02");
  await page.getByLabel("店名").fill(values.shopName);
  await page.getByLabel("カテゴリ", { exact: true }).selectOption({ label: values.category });
  await page.getByLabel("金額").fill(values.amount);
  await page.getByLabel("支払い方法").fill("現金");
  await page.getByRole("button", { name: "追加" }).click();
  await expect(page.getByRole("cell", { name: values.shopName }).first()).toBeVisible();
}
