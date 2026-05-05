import { expect, type Page } from "@playwright/test";

export async function gotoAppPage(page: Page, path: string, heading: string) {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
}

export async function expectLoginRedirect(page: Page, redirectPath: string) {
  const redirectQuery = new URLSearchParams({ redirect: redirectPath }).toString();
  await expect(page).toHaveURL(new RegExp(`/login\\?${escapeRegExp(redirectQuery)}$`));
  await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
