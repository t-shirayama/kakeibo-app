# 画面イメージ

このディレクトリは、現行画面のスクリーンショットとアーカイブ済みデザイン案の置き場です。

## 現行スクリーンショット

- [ダッシュボード](dashboard.png)
- [カレンダー](calendar.png)
- [明細一覧](transactions.png)
- [明細編集モーダル](transaction-edit-modal.png)
- [収入設定](income-settings.png)
- [アップロード](upload.png)
- [カテゴリ管理](categories.png)
- [設定](settings.png)

## アーカイブ

- [初期構想と旧デザイン案](archive/initial-concepts/)
- [旧レポート画面などの過去スクリーン](archive/legacy-screens/)
- [ToBe 原案](archive/ToBe/)

画面要件の `対応デザイン` は、原則としてこの一覧にある現行スクリーンショットを参照する。過去案を残したい場合は `archive/` 配下へ移す。

## 更新方法

現行スクリーンショットを撮り直す場合は、Docker Compose 上の Playwright で次を実行する。

```powershell
docker compose run --rm -e DOC_SCREENSHOT_CAPTURE=1 e2e npx playwright test docs-screenshots.spec.ts
```
