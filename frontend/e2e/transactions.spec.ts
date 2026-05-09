import { expect, test } from "@playwright/test";
import { gotoAppPage } from "./helpers/navigation";
import {
  createTransaction,
  createTransactions,
  deleteTransaction,
  fillTransactionForm,
  openTransactionEditForm,
  openTransactionCreateForm,
  setTransactionDateRange,
  submitTransactionForm,
} from "./helpers/transactions";

test("searches, creates, edits, deletes, and exports transactions", async ({ page }) => {
  await gotoAppPage(page, "/transactions", "明細一覧");

  // 初期表示は今月の明細に絞られるため、今月・先月の切り替えをまず確認する。
  await expect(page.getByLabel("適用中のフィルタ").getByText("今月")).toBeVisible();
  await expect(page.getByText(/件ヒット/)).toBeVisible();
  await expect(page.getByText("検索対象: 店名 / メモ / カテゴリ")).toBeVisible();
  await expect(page.getByText("ソート: 日付 降順")).toBeVisible();
  await expect(page.getByText(/1ページ (10|20|50)件/)).toBeVisible();
  await expect(page.getByRole("cell", { name: "まいばすけっと" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Amazon.co.jp", exact: true })).toHaveCount(0);
  await expect(page.locator(".transaction-amount.expense").first()).toBeVisible();

  await setTransactionDateRange(page, "2026-04-01", "2026-04-30");
  await expect(page.getByRole("cell", { name: "Amazon.co.jp", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "成城石井" })).toHaveCount(0);
  await expect(page.getByLabel("適用中のフィルタ").getByText("2026-04-01 - 2026-04-30")).toBeVisible();

  await setTransactionDateRange(page, "2026-01-01", "2026-12-31");
  await page.getByLabel("カテゴリ絞り込み").selectOption({ label: "日用品" });
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
  await setTransactionDateRange(page, "2025-12-01", "2025-12-31");
  await page.getByLabel("カテゴリ絞り込み").selectOption({ label: "未分類" });
  await expect(page.getByRole("cell", { name: "名称未確定の取引" })).toBeVisible();

  // 未分類は検索語としても使えるため、カテゴリ名補完込みで検索対象に入ることを守る。
  await page.getByLabel("明細検索").fill("未分類");
  await expect(page.getByRole("cell", { name: "名称未確定の取引" })).toBeVisible();

  await page.getByRole("button", { name: "フィルタ解除" }).click();
  await expect(page).not.toHaveURL(/keyword=/);
  await expect(page).toHaveURL(/period=all/);
  await expect(page.getByLabel("開始日")).toHaveValue("");
  await expect(page.getByLabel("終了日")).toHaveValue("");
  await expect(page.getByLabel("適用中のフィルタ").getByText("条件なし")).toBeVisible();
  await setTransactionDateRange(page, "2026-01-01", "2026-12-31");
  await page.getByLabel("カテゴリ絞り込み").selectOption({ label: "すべてのカテゴリ" });
  await expect(page.getByLabel("適用中のフィルタ").getByText("2026-01-01 - 2026-12-31")).toBeVisible();
  await openTransactionCreateForm(page);
  await fillTransactionForm(page, {
    transactionDate: "2026-12-31",
    shopName: "E2Eテスト店舗",
    category: "食費",
    amount: "1234",
    paymentMethod: "現金",
    memo: "E2E追加",
  });
  await submitTransactionForm(page, "追加");

  await expect(page.getByRole("cell", { name: "E2Eテスト店舗" })).toBeVisible();

  await openTransactionEditForm(page, "E2Eテスト店舗");
  await fillTransactionForm(page, {
    shopName: "E2Eテスト店舗 編集済み",
    amount: "2345",
  });
  await submitTransactionForm(page, "保存");

  await expect(page.getByRole("cell", { name: "E2Eテスト店舗 編集済み" })).toBeVisible();

  // ブラウザの保存先に依存しないよう、Excel APIの成功レスポンスまでを検証する。
  await page.getByLabel("明細検索").fill("Amazon");
  await expect(page).toHaveURL(/keyword=Amazon/);
  await expect(page.getByRole("cell", { name: "Amazon.co.jp", exact: true })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/keyword=Amazon/);
  await expect(page.getByLabel("明細検索")).toHaveValue("Amazon");
  await expect(page.getByLabel("適用中のフィルタ").getByText("2026-01-01 - 2026-12-31")).toBeVisible();
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

  await deleteTransaction(page, "E2Eテスト店舗 編集済み");

  await expect(page.getByRole("cell", { name: "E2Eテスト店舗 編集済み" })).toHaveCount(0);
});

test("asks whether to update categories for the same shop name", async ({ page }) => {
  await gotoAppPage(page, "/transactions", "明細一覧");
  await setTransactionDateRange(page, "2026-01-01", "2026-12-31");
  await page.getByLabel("カテゴリ絞り込み").selectOption({ label: "すべてのカテゴリ" });

  await createTransactions(page, [
    { shopName: "E2E一括店舗", amount: "1111", category: "食費" },
    { shopName: "E2E一括店舗", amount: "2222", category: "食費" },
  ]);

  const bulkRows = page.getByRole("row").filter({ hasText: "E2E一括店舗" });
  await expect(bulkRows).toHaveCount(2);
  await openTransactionEditForm(page, "E2E一括店舗");
  await fillTransactionForm(page, { category: "日用品" });
  await submitTransactionForm(page, "保存");
  const bulkDialog = page.getByRole("dialog").filter({ hasText: "同じ店名の明細を一括更新しますか？" });
  await expect(bulkDialog.getByRole("heading", { name: "同じ店名の明細を一括更新しますか？" })).toBeVisible();
  await bulkDialog.getByRole("button", { name: "一括更新する" }).click();
  await expect(page.getByRole("row").filter({ hasText: "E2E一括店舗" }).filter({ hasText: "日用品" })).toHaveCount(2);

  await createTransactions(page, [
    { shopName: "E2E単独店舗", amount: "3333", category: "食費" },
    { shopName: "E2E単独店舗", amount: "4444", category: "食費" },
  ]);

  const singleRows = page.getByRole("row").filter({ hasText: "E2E単独店舗" });
  await expect(singleRows).toHaveCount(2);
  await openTransactionEditForm(page, "E2E単独店舗");
  await fillTransactionForm(page, { category: "日用品" });
  await submitTransactionForm(page, "保存");
  const cancelDialog = page.getByRole("dialog").filter({ hasText: "同じ店名の明細を一括更新しますか？" });
  await expect(cancelDialog.getByRole("heading", { name: "同じ店名の明細を一括更新しますか？" })).toBeVisible();
  await cancelDialog.getByRole("button", { name: "キャンセル" }).click();
  await expect(page.getByRole("heading", { name: "明細を編集" })).toBeVisible();
  await page.getByRole("button", { name: "閉じる" }).click();
  await expect(page.getByRole("row").filter({ hasText: "E2E単独店舗" }).filter({ hasText: "食費" })).toHaveCount(2);
  await expect(page.getByRole("row").filter({ hasText: "E2E単独店舗" }).filter({ hasText: "日用品" })).toHaveCount(0);
});
