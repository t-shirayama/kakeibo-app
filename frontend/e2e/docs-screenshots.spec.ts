import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const outputDir = path.resolve(process.cwd(), ".doc-screenshots");

test.skip(!process.env.DOC_SCREENSHOT_CAPTURE, "通常の E2E 実行では画面キャプチャを含めない。");

test.beforeAll(async () => {
  await mkdir(outputDir, { recursive: true });
});

test("captures current application screenshots for docs", async ({ page }) => {
  const requestedTargets = new Set(
    (process.env.DOC_SCREENSHOT_ONLY ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const allPageTargets = [
    { fileName: "dashboard.png", path: "/dashboard?month=2026-04", heading: "ダッシュボード" },
    { fileName: "budgets.png", path: "/budgets?month=2026-04&tab=actuals", heading: "予算管理" },
    { fileName: "calendar.png", path: "/calendar?month=2026-04", heading: "カレンダー" },
    {
      fileName: "transactions.png",
      path: "/transactions?date_from=2026-01-01&date_to=2026-12-31&page=1&page_size=10&sort_field=date&sort_direction=desc",
      heading: "明細一覧",
    },
    { fileName: "income-settings.png", path: "/income-settings", heading: "収入設定" },
    { fileName: "upload.png", path: "/upload", heading: "アップロード" },
    { fileName: "categories.png", path: "/categories", heading: "カテゴリ管理" },
    { fileName: "category-rules.png", path: "/category-rules", heading: "分類ルール" },
    { fileName: "audit-logs.png", path: "/audit-logs", heading: "監査ログ" },
    { fileName: "settings.png", path: "/settings", heading: "設定" },
  ] as const;
  const pageTargets = allPageTargets.filter((target) => requestedTargets.size === 0 || requestedTargets.has(target.fileName.replace(".png", "")));

  await page.setViewportSize({ width: 1440, height: 900 });

  for (const target of pageTargets) {
    await page.goto(target.path);
    await expect(page.getByRole("heading", { name: target.heading, exact: true })).toBeVisible();
    await expect(page.getByText("読み込み中です")).toHaveCount(0, { timeout: 15_000 });
    await page.screenshot({
      path: path.join(outputDir, target.fileName),
      fullPage: false,
    });
  }

  await page.goto("/transactions?date_from=2026-01-01&date_to=2026-12-31&page=1&page_size=10&sort_field=date&sort_direction=desc");
  await page.getByRole("button", { name: "明細を編集" }).first().click();
  await expect(page.getByRole("heading", { name: "明細を編集" })).toBeVisible();
  await page.getByRole("dialog").screenshot({
    path: path.join(outputDir, "transaction-edit-modal.png"),
  });
});
