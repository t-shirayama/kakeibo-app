import { expect, test } from "@playwright/test";
import { loginAsSampleUser, newAnonymousContext } from "./helpers/auth";

test.describe("authentication", () => {
  test("redirects protected pages to login when unauthenticated", async ({ browser }) => {
    // 認証済み状態を持たない新規コンテキストで、保護画面のガードを確認する。
    const context = await newAnonymousContext(browser);
    const page = await context.newPage();

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard$/);
    await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();

    await context.close();
  });

  test("logs in as the sample user", async ({ browser }) => {
    const context = await newAnonymousContext(browser);
    const page = await context.newPage();

    await loginAsSampleUser(page);

    await context.close();
  });

  test("recovers from a missing csrf session during login", async ({ browser }) => {
    const context = await newAnonymousContext(browser);
    const page = await context.newPage();
    let loginAttempts = 0;

    await page.route("**/api/auth/login", async (route) => {
      loginAttempts += 1;
      if (loginAttempts === 1) {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ error: { code: "http_403", message: "CSRF session is required." } }),
        });
        return;
      }
      await route.continue();
    });

    await loginAsSampleUser(page);
    expect(loginAttempts).toBe(2);

    await context.close();
  });

  test("returns to login when an authenticated API call receives 401", async ({ page }) => {
    // アクセストークン期限切れとリフレッシュ失敗を同時に再現し、ログインへ戻る導線を守る。
    await page.route("**/api/dashboard/summary?**", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "http_401", message: "Authentication is required." } }),
      });
    });
    await page.route("**/api/auth/refresh", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "http_401", message: "Refresh token is required." } }),
      });
    });

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard(?:%3Fmonth%3D\d{4}-\d{2})?$/);
  });
});
