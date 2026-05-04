import { expect, test } from "@playwright/test";
import { gotoAppPage } from "./helpers/navigation";

test("creates and updates monthly income settings", async ({ page }) => {
  await gotoAppPage(page, "/income-settings", "収入設定");

  await page.getByLabel("対象").fill("E2E収入");
  await page.getByLabel("毎月の金額").fill("345000");
  await page.getByLabel("発生日").fill("25");
  await page.getByRole("button", { name: "追加" }).click();

  const overrideAmount = page.getByLabel("E2E収入の月別金額");
  const overrideDay = page.getByLabel("E2E収入の月別発生日");
  const saveOverrideButton = page.getByRole("button", { name: "月別変更を保存" });

  await expect(overrideAmount).toBeVisible();
  await overrideAmount.fill("365000");
  await overrideDay.fill("20");
  await saveOverrideButton.click();
  await expect(page.getByText("365,000")).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "E2E収入を削除" }).click();
  await expect(page.getByLabel("E2E収入の月別金額")).toHaveCount(0);
});
