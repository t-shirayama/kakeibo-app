import { expect, test } from "@playwright/test";

test("shows category colors and creates a category", async ({ page }) => {
  await page.goto("/categories");

  await expect(page.getByRole("heading", { name: "カテゴリ管理" })).toBeVisible();
  await expect(page.getByText("食費")).toBeVisible();

  const foodRow = page.locator(".category-row").filter({ hasText: "食費" });
  await expect(foodRow.locator(".swatch")).toHaveCSS("background-color", "rgb(255, 107, 122)");

  page.once("dialog", (dialog) => dialog.accept("E2Eカテゴリ"));
  await page.getByRole("button", { name: "カテゴリを追加" }).click();

  await expect(page.getByText("E2Eカテゴリ")).toBeVisible();
});
