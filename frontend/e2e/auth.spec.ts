import { test } from "@playwright/test";
import { loginAsSampleUser, newAnonymousContext } from "./helpers/auth";
import { expectLoginRedirect } from "./helpers/navigation";

test.describe("authentication", () => {
  test("redirects protected pages to login when unauthenticated", async ({ browser }) => {
    // 認証済み状態を持たない新規コンテキストで、保護画面のガードを確認する。
    const context = await newAnonymousContext(browser);
    const page = await context.newPage();

    await page.goto("/dashboard");
    await expectLoginRedirect(page, "/dashboard");

    await context.close();
  });

  test("logs in as the sample user", async ({ browser }) => {
    const context = await newAnonymousContext(browser);
    const page = await context.newPage();

    await loginAsSampleUser(page);

    await context.close();
  });
});
