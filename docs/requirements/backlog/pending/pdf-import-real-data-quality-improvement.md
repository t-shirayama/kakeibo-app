# 実データを用いたPDF取込機能の精度向上、検証、リファクタリング

## 状態

未対応

## 優先度

B

## 目的

実運用に近いPDFで取込精度を上げ、誤抽出や保守しづらい処理を早めに減らす。

## 対象

- `docs/specs/pdf-import/README.md`
- `backend/app/application/importing/`
- `backend/app/infrastructure/parsers/`
- `backend/tests/`
- 必要に応じて `frontend/e2e/upload.spec.ts`

## 対応内容

実データをもとに抽出失敗や誤分類の傾向を整理し、PDF取込処理の判定ロジックと責務分割を見直したうえで、再現用fixtureと検証テストを追加する。

## 完了条件

実データ由来の代表パターンがfixture化され、精度改善内容と制約が `docs/specs/pdf-import/README.md` に反映され、関連するバックエンドテストと必要なE2Eで回帰確認できる。

## 根拠

ユーザー依頼「実データを用いてPDF取込機能精度向上と検証とリファクタリングを追加して」。
