import { expect, type Page } from "@playwright/test";

export async function gotoAppPage(page: Page, path: string, heading: string) {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
}
