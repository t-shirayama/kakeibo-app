import { expect, test } from "@playwright/test";
import { gotoAppPage } from "./helpers/navigation";
import { uploadPdfAndWaitForHistory } from "./helpers/upload";

test("creates a shop keyword rule and applies it to uploaded transactions", async ({ page }) => {
  await gotoAppPage(page, "/category-rules", "分類ルール");

  await page.getByRole("button", { name: "ルールを追加" }).click();
  await page.getByLabel("店名キーワード").fill("E2Eテスト");
  await page.getByLabel("カテゴリ").selectOption({ label: "食費" });
  await page.getByRole("button", { name: "追加", exact: true }).click();

  const ruleRow = page.locator(".category-row").filter({ hasText: "E2Eテスト" });
  await expect(ruleRow).toContainText("食費へ分類");

  await gotoAppPage(page, "/upload", "アップロード");
  await uploadPdfAndWaitForHistory(page, "e2e-category-rule.pdf");

  await gotoAppPage(page, "/transactions?period=all&keyword=E2E%E3%83%86%E3%82%B9%E3%83%88", "明細一覧");
  await page.getByLabel("カテゴリ絞り込み").selectOption({ label: "食費" });
  await expect(page.getByRole("row").filter({ hasText: "E2Eテストストア" }).filter({ hasText: "食費" }).first()).toBeVisible();

  await gotoAppPage(page, "/category-rules", "分類ルール");
  await ruleRow.getByRole("button", { name: "無効化" }).click();
  await expect(ruleRow).toContainText("無効");
  await ruleRow.getByRole("button", { name: "E2Eテストを削除" }).click();
  await page.getByRole("button", { name: "削除する" }).click();
  await expect(page.getByText("E2Eテスト")).toHaveCount(0);
});
