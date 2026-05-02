import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

const checks = [
  ["app/(app)/dashboard/page.tsx", ["ダッシュボード", "カテゴリ別支出割合", "最近の明細"]],
  ["app/(app)/transactions/page.tsx", ["明細一覧", "TransactionEditModal", "EmptyState"]],
  ["app/(app)/income-settings/page.tsx", ["収入設定", "登録済み収入", "月別変更"]],
  ["app/(app)/categories/page.tsx", ["カテゴリ管理", "分類ルール", "EmptyState"]],
  ["app/(app)/upload/page.tsx", ["アップロード", "アップロード履歴", "EmptyState"]],
  ["app/(app)/reports/page.tsx", ["レポート", "月別支出", "EmptyState"]],
  ["app/(app)/settings/page.tsx", ["設定", "1ページあたりの件数", "全データ削除"]],
  ["app/login/page.tsx", ["ログイン", "パスワードを忘れた場合"]],
  ["app/password-reset/page.tsx", ["パスワードリセット", "送信しました"]],
  ["app/(app)/loading.tsx", ["LoadingState"]],
  ["app/(app)/error.tsx", ["ApiErrorAlert", "StateBlock"]],
];

const failures = [];

for (const [path, expectedTexts] of checks) {
  const content = readFileSync(resolve(root, path), "utf8");
  for (const text of expectedTexts) {
    if (!content.includes(text)) {
      failures.push(`${path} does not contain "${text}"`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Checked ${checks.length} frontend screen files.`);
