import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

export const sampleUser = {
  email: "sample@example.com",
  password: "SamplePassw0rd!",
} as const;

export const authFile = "e2e/.auth/sample-user.json";
export const emptyStorageState = { cookies: [], origins: [] };

export async function ensureAuthDirectory() {
  await mkdir("e2e/.auth", { recursive: true });
}

export async function loginAsSampleUser(page: Page) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto("/login");
    await page.getByLabel("メールアドレス").fill(sampleUser.email);
    await page.getByLabel("パスワード").fill(sampleUser.password);
    await page.getByRole("button", { name: "ログイン" }).click();

    try {
      // setup project の初回ログインでは、遷移先ページのコンパイルで待ち時間が伸びやすい。
      await expect(page).toHaveURL(/\/dashboard(\?.*)?$/, { timeout: 30_000 });
      await expect(page.getByRole("heading", { name: "ダッシュボード" })).toBeVisible();
      return;
    } catch (error) {
      if (attempt === 1) {
        throw error;
      }
    }
  }
}

export async function newAnonymousContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({ storageState: emptyStorageState });
}
