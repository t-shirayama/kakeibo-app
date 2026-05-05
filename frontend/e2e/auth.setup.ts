import { test as setup } from "@playwright/test";
import { authFile, ensureAuthDirectory, loginAsSampleUser } from "./helpers/auth";

setup("authenticate sample user", async ({ page }) => {
  await ensureAuthDirectory();
  await loginAsSampleUser(page);

  await page.context().storageState({ path: authFile });
});
