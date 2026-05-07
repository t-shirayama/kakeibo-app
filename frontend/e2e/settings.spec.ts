import { expect, test } from "@playwright/test";
import { gotoAppPage } from "./helpers/navigation";

test("shows, updates, and preserves destructive settings controls", async ({ page }) => {
  await gotoAppPage(page, "/settings", "設定");

  // 通貨など固定扱いの項目と、ユーザーが保存できる表示設定を同時に確認する。
  await expect(page.getByLabel("表示通貨")).toHaveValue("JPY");
  await expect(page.getByLabel("1ページあたりの件数")).toHaveValue("10");
  await expect(page.getByLabel("日付形式")).toHaveValue("yyyy/MM/dd");

  await page.getByLabel("1ページあたりの件数").selectOption("50");
  await page.getByLabel("日付形式").selectOption("yyyy-MM-dd");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page.getByText("保存しました。")).toBeVisible();
  await page.goto("/transactions");
  await expect(page.getByText("1ページ 50件")).toBeVisible();
  await expect(page).toHaveURL(/page_size=50/);

  // 全データ削除は確認文字列なしでは押せないことを、通常設定保存後も確認する。
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "全データ削除" })).toBeVisible();
  await expect(page.getByLabel("削除確認文字列")).toBeVisible();
  await expect(page.getByRole("button", { name: "全データを削除" })).toBeDisabled();
});
