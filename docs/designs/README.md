# 画面イメージ

このディレクトリは、現行画面のスクリーンショットの置き場です。

## 現行スクリーンショット

- [ダッシュボード](dashboard.png)
- [予算管理](budgets.png)
- [カレンダー](calendar.png)
- [明細一覧](transactions.png)
- [明細編集モーダル](transaction-edit-modal.png)
- [収入設定](income-settings.png)
- [アップロード](upload.png)
- [カテゴリ管理](categories.png)
- [監査ログ](audit-logs.png)
- [設定](settings.png)

画面要件の `対応デザイン` は、原則としてこの一覧にある現行スクリーンショットを参照する。

## 更新方法

現行スクリーンショットを撮り直す場合は、Docker Compose 上の Playwright で次を実行する。

```powershell
docker compose run --rm -e DOC_SCREENSHOT_CAPTURE=1 e2e npx playwright test docs-screenshots.spec.ts
```

更新時は次の順番を守る。

1. `frontend/e2e/docs-screenshots.spec.ts` を正として新しい画像を生成する。
2. 生成した PNG を `docs/designs/` へ反映する。
3. この一覧と README の画面イメージを同じ作業内で更新する。

撮影比率や対象画面は、原則として `frontend/e2e/docs-screenshots.spec.ts` に集約し、画面追加時は同ファイルとこの一覧を同時に更新する。
