# 未完了タスク

このファイルは未完了の実装タスクだけを管理します。

完了済みタスクは [完了済みタスク](completed.md) に退避しています。

仕様の正本は `docs/specs/` 配下です。タスク実行中に仕様変更が発生した場合は、関連するSSOT文書を同じ作業内で更新してください。

## 優先度A

- [ ] application層からinfrastructure層へのPDF取込依存をなくす
  - 目的: DDD / レイヤードアーキテクチャの依存方向を守り、ユースケースを具象実装から切り離す。
  - 対象: `backend/app/application/importing/upload_import.py`, `backend/app/application/importing/ports.py`, `backend/app/presentation/api/service_factories.py`
  - 対応: `UploadRepositoryProtocol` と `UploadStorageProtocol` をapplication層へ定義し、`PdfUploadUseCases` はProtocolへ依存させる。
  - 完了条件: `application -> infrastructure` のimportがPDF取込周辺から消え、関連バックエンドテストが通る。
  - 根拠: `docs/tasks/kakeibo-app-repository-review.md` の優先度A-1。

- [ ] フロントエンドをfeatures構成へ段階的に移行する
  - 目的: 画面・業務機能ごとの変更範囲を明確にし、Codexが対象ファイルを絞りやすくする。
  - 対象: `frontend/src/components/`, `frontend/app/(app)/transactions`, `frontend/app/(app)/dashboard`, `frontend/app/(app)/upload`, `frontend/app/(app)/income-settings`
  - 対応: 複雑な画面から `frontend/src/features/*` へ移し、共通UIだけを `src/components/` に残す。
  - 完了条件: 主要な業務画面の実体がfeature配下に分かれ、既存のtypecheckと関連E2Eが通る。
  - 根拠: `docs/tasks/kakeibo-app-repository-review.md` の優先度A-2。

- [ ] Codex向けに変更パターン別の参照順を追加する
  - 目的: API、DB、UI、E2E、PDF取込などの変更時に参照先を迷いにくくする。
  - 対象: `.codex/AGENTS.md`
  - 対応: 変更パターン別に、仕様・実装・テスト・生成物の参照順を追記する。
  - 完了条件: `.codex/AGENTS.md` に変更種別ごとの参照順がまとまり、未確定事項チェックが通る。
  - 根拠: `docs/tasks/kakeibo-app-repository-review.md` の優先度A-3。

## 優先度B

- [ ] service_factories.pyをbootstrap/container.pyへ移す
  - 目的: presentation層をHTTP入出力へ集中させ、依存配線の肥大化を防ぐ。
  - 対象: `backend/app/presentation/api/service_factories.py`, `backend/app/bootstrap/container.py`
  - 対応: ユースケース、Repository、Parser、Storage、Settingsの組み立てをbootstrap層へ分離する。
  - 完了条件: APIルートの動作が変わらず、関連バックエンドテストが通る。
  - 根拠: `docs/tasks/kakeibo-app-repository-review.md` の優先度B-4。

- [ ] applicationファイルを機能別ディレクトリへ分割する
  - 目的: `transactions.py` などの責務集中を避け、commands / ports / policies / use_cases を見つけやすくする。
  - 対象: `backend/app/application/transactions.py`
  - 対応: 機能単位のディレクトリ構成へ分割し、既存importを更新する。
  - 完了条件: 分割後もAPI・ユースケース・リポジトリテストが通る。
  - 根拠: `docs/tasks/kakeibo-app-repository-review.md` の優先度B-5。

- [ ] import依存ルールをCIでチェックする
  - 目的: domain/application層が外側の層へ依存する退行を早期検出する。
  - 対象: `backend/app/`, `.github/workflows/`
  - 対応: `domain -> application/infrastructure/presentation` と `application -> infrastructure/presentation` を禁止するチェックを追加する。
  - 完了条件: CIまたは品質チェックで依存違反が検出でき、既存構成でチェックが通る。
  - 根拠: `docs/tasks/kakeibo-app-repository-review.md` の優先度B-6。

## 優先度C

- [ ] TanStack QueryのqueryKeysをfeatureごとに分離する
  - 目的: サーバー状態のキー管理を安定させ、画面間のキャッシュ操作を追いやすくする。
  - 対象: `frontend/src/features/*/queryKeys.ts`, `frontend/src/lib/api.ts`
  - 対応: 主要機能ごとにquery key定義を集約し、画面側の直書きを減らす。
  - 完了条件: typecheckと関連E2Eが通る。
  - 根拠: `docs/tasks/kakeibo-app-repository-review.md` の優先度C-7。

- [ ] E2Eのデータ準備と共通操作を整理する
  - 目的: E2E増加時の重複と不安定化を抑える。
  - 対象: `frontend/e2e/`, `frontend/scripts/reset-e2e-db.mjs`
  - 対応: fixtures / helpers などへ共通処理を分離し、既存specから利用する。
  - 完了条件: `docker compose run --rm e2e` が通り、代表的な共通操作がhelper化されている。
  - 根拠: `docs/tasks/kakeibo-app-repository-review.md` の優先度C-8。
