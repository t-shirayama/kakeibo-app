import { expect, test } from "@playwright/test";
import { gotoAppPage } from "./helpers/navigation";

test("shows audit log filters and paginated entries", async ({ page }) => {
  await gotoAppPage(page, "/audit-logs", "監査ログ");

  await expect(page.getByLabel("操作種別")).toBeVisible();
  await expect(page.getByLabel("対象種別")).toBeVisible();
  await expect(page.getByLabel("監査ログ開始日")).toBeVisible();
  await expect(page.getByLabel("監査ログ終了日")).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "日時" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "操作" })).toBeVisible();
  await expect(page.getByLabel("監査ログページネーション")).toBeVisible();
});
