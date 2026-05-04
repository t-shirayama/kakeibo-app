# 未完了タスク

このファイルは未完了の実装タスクだけを管理します。

完了済みタスクは [完了済みタスク](completed.md) に退避しています。

仕様の正本は `docs/specs/` 配下です。タスク実行中に仕様変更が発生した場合は、関連するSSOT文書を同じ作業内で更新してください。

## 優先度A

## 優先度B

- [ ] applicationファイルを機能別ディレクトリへ分割する
  - 目的: `transactions.py` などの責務集中を避け、commands / ports / policies / use_cases を見つけやすくする。
  - 対象: `backend/app/application/transactions.py`
  - 対応: 機能単位のディレクトリ構成へ分割し、既存importを更新する。
  - 完了条件: 分割後もAPI・ユースケース・リポジトリテストが通る。
- [ ] import依存ルールをCIでチェックする
  - 目的: domain/application層が外側の層へ依存する退行を早期検出する。
  - 対象: `backend/app/`, `.github/workflows/`
  - 対応: `domain -> application/infrastructure/presentation` と `application -> infrastructure/presentation` を禁止するチェックを追加する。
  - 完了条件: CIまたは品質チェックで依存違反が検出でき、既存構成でチェックが通る。

## 優先度C

- [ ] TanStack QueryのqueryKeysをfeatureごとに分離する
  - 目的: サーバー状態のキー管理を安定させ、画面間のキャッシュ操作を追いやすくする。
  - 対象: `frontend/src/features/*/queryKeys.ts`, `frontend/src/lib/api.ts`
  - 対応: 主要機能ごとにquery key定義を集約し、画面側の直書きを減らす。
  - 完了条件: typecheckと関連E2Eが通る。

- [ ] E2Eのデータ準備と共通操作を整理する
  - 目的: E2E増加時の重複と不安定化を抑える。
  - 対象: `frontend/e2e/`, `frontend/scripts/reset-e2e-db.mjs`
  - 対応: fixtures / helpers などへ共通処理を分離し、既存specから利用する。
  - 完了条件: `docker compose run --rm e2e` が通り、代表的な共通操作がhelper化されている。
