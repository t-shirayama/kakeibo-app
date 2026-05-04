import { expect, test as setup } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const authFile = "e2e/.auth/sample-user.json";

setup("authenticate sample user", async ({ page }) => {
  await mkdir("e2e/.auth", { recursive: true });

  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill("sample@example.com");
  await page.getByLabel("パスワード").fill("SamplePassw0rd!");
  await page.getByRole("button", { name: "ログイン" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "レポート" })).toBeVisible();

  await page.context().storageState({ path: authFile });
});
