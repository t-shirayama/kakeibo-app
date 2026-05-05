import { expect, test } from "@playwright/test";
import { gotoAppPage, waitForHydration } from "./helpers/navigation";

const routes = [
  ["ダッシュボード", "/dashboard"],
  ["カレンダー", "/calendar"],
  ["明細一覧", "/transactions"],
  ["収入設定", "/income-settings"],
  ["アップロード", "/upload"],
  ["カテゴリ管理", "/categories"],
  ["設定", "/settings"],
] as const;

test("navigates between all primary screens from the sidebar", async ({ page }) => {
  await gotoAppPage(page, "/dashboard", "ダッシュボード");

  // サイドバーの主要導線が全画面へ遷移できることをまとめて確認する。
  for (const [label, path] of routes) {
    await page.getByRole("link", { name: label, exact: true }).click();
    await waitForHydration(page);
    await expect(page).toHaveURL(new RegExp(`${path}(\\?.*)?$`));
    await expect(page.getByRole("heading", { name: label, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
  }
});

test("places settings at the bottom of the desktop sidebar", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await gotoAppPage(page, "/dashboard", "ダッシュボード");

  const sidebarBox = await page.getByLabel("メインナビゲーション").boundingBox();
  const settingsBox = await page.getByRole("link", { name: "設定", exact: true }).boundingBox();
  const reportsBox = await page.getByRole("link", { name: "ダッシュボード", exact: true }).boundingBox();

  expect(sidebarBox).not.toBeNull();
  expect(settingsBox).not.toBeNull();
  expect(reportsBox).not.toBeNull();
  expect(settingsBox!.y).toBeGreaterThan(reportsBox!.y);
  expect(sidebarBox!.y + sidebarBox!.height - (settingsBox!.y + settingsBox!.height)).toBeLessThan(48);
});

test("keeps initial app page scroll inside the main content area", async ({ page }) => {
  await gotoAppPage(page, "/dashboard", "ダッシュボード");

  // 初期表示でbody側に少しだけ縦スクロールが出る退行を検知する。
  const documentScroll = await page.evaluate(() => {
    const root = document.scrollingElement ?? document.documentElement;
    return {
      clientHeight: root.clientHeight,
      scrollHeight: root.scrollHeight,
    };
  });

  expect(documentScroll.scrollHeight).toBeLessThanOrEqual(documentScroll.clientHeight + 1);
});
