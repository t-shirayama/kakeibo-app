# 未完了タスク

このファイルは未完了の実装タスクだけを管理します。

完了済みタスクは [完了済みタスク](completed.md) に退避しています。

仕様の正本は `docs/specs/` 配下です。タスク実行中に仕様変更が発生した場合は、関連するSSOT文書を同じ作業内で更新してください。

## 優先度B

- [ ] 実データを用いてPDF取込機能の精度向上、検証、リファクタリングを行う
  - 目的: 実運用に近いPDFで取込精度を上げ、誤抽出や保守しづらい処理を早めに減らす
  - 対象: `docs/specs/pdf-import/README.md`、`backend/app/application/importing/`、`backend/app/infrastructure/parsers/`、`backend/tests/`、必要に応じて `frontend/e2e/upload.spec.ts`
  - 対応: 実データをもとに抽出失敗や誤分類の傾向を整理し、PDF取込処理の判定ロジックと責務分割を見直したうえで、再現用fixtureと検証テストを追加する
  - 完了条件: 実データ由来の代表パターンがfixture化され、精度改善内容と制約が `docs/specs/pdf-import/README.md` に反映され、関連するバックエンドテストと必要なE2Eで回帰確認できる
  - 根拠: ユーザー依頼「実データを用いてPDF取込機能精度向上と検証とリファクタリングを追加して」

## 優先度C
