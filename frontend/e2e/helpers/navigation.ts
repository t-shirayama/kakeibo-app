import { expect, type Page } from "@playwright/test";

export async function gotoAppPage(page: Page, path: string, heading: string) {
  await page.goto(path);
  await expectPageUrl(page, path);
  await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
}

export async function gotoRedirectedAppPage(page: Page, path: string, redirectedPath: string, heading: string) {
  await page.goto(path);
  await expectPageUrl(page, redirectedPath);
  await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
}

export async function expectLoginRedirect(page: Page, redirectPath: string) {
  const redirectQuery = new URLSearchParams({ redirect: redirectPath }).toString();
  await expect(page).toHaveURL(new RegExp(`/login\\?${escapeRegExp(redirectQuery)}$`));
  await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
}

async function expectPageUrl(page: Page, path: string) {
  const hasQuery = path.includes("?");
  const pattern = hasQuery
    ? new RegExp(`${escapeRegExp(path)}$`)
    : new RegExp(`${escapeRegExp(path)}(?:\\?.*)?$`);
  await expect(page).toHaveURL(pattern);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
