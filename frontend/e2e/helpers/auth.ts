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
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(sampleUser.email);
  await page.getByLabel("パスワード").fill(sampleUser.password);
  await page.getByRole("button", { name: "ログイン" }).click();

  await expect(page).toHaveURL(/\/dashboard(\?.*)?$/);
  await expect(page.getByRole("heading", { name: "レポート" })).toBeVisible();
}

export async function newAnonymousContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({ storageState: emptyStorageState });
}
