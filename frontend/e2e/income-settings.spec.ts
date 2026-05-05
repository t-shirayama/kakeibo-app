import { expect, test } from "@playwright/test";
import { gotoAppPage } from "./helpers/navigation";

test("creates and updates monthly income settings", async ({ page }) => {
  await gotoAppPage(page, "/income-settings", "収入設定");

  await page.getByLabel("対象").fill("E2E収入");
  await page.getByLabel("毎月の金額").fill("345000");
  await page.getByLabel("発生日").fill("25");
  await page.getByLabel("登録開始月").fill("2026-03");
  await page.getByLabel("登録終了月").fill("2026-12");
  await page.getByRole("button", { name: "追加" }).click();

  const overrideAmount = page.getByLabel("E2E収入の月別金額");
  const overrideDay = page.getByLabel("E2E収入の月別発生日");
  const saveOverrideButton = page.getByRole("button", { name: "月別変更を保存" });

  await expect(overrideAmount).toBeVisible();
  await expect(page.getByText("2026-03 - 2026-12")).toBeVisible();
  await overrideAmount.fill("365000");
  await overrideDay.fill("20");
  await saveOverrideButton.click();
  await expect(page.getByText("365,000")).toBeVisible();

  await page.getByRole("button", { name: "E2E収入を削除" }).click();
  await page.getByRole("button", { name: "削除する" }).click();
  await expect(page.getByLabel("E2E収入の月別金額")).toHaveCount(0);
});
