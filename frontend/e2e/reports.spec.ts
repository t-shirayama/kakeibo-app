import { expect, test } from "@playwright/test";
import { gotoRedirectedAppPage } from "./helpers/navigation";

test("redirects legacy reports route to dashboard and keeps export available", async ({ page }) => {
  await gotoRedirectedAppPage(page, "/reports", "/dashboard", "ダッシュボード");
  await expect(page.getByRole("heading", { name: "カテゴリ別支出の割合" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Excel" })).toBeVisible();
});
