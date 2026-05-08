# プロジェクトルール

## この文書の役割

この文書は、`docs/specs/` 全体の入口として、参照導線と最重要の横断ルールだけをまとめる。

詳細な開発・運用ルールは `../development-workflow/README.md`、横断的な設計原則は `../architecture-principles/README.md`、業務仕様は各SSOTを参照する。

## ドキュメント構成

`docs/specs/` を仕様書のSSOTとする。仕様書の入口は `docs/specs/README.md` とし、個別仕様はテーマごとのフォルダに置く。

- `docs/specs/project-rules/README.md`: SSOT全体の入口と、更新先の判断基準を置く。
- `docs/specs/development-workflow/README.md`: 仕様更新、単体テスト・Integration Test・E2Eの方針、Docker Compose での確認、CI、Dependabot運用を置く。
- `docs/specs/architecture-principles/README.md`: 技術スタック、レイヤ構成、依存方向、システム境界を置く。
- `docs/specs/domain-model/README.md`: ドメイン概念、不変条件、業務ルールを置く。
- `docs/specs/api-specs/README.md`: APIの共通契約とエンドポイント概要を置く。
- `docs/specs/db-schema/README.md`: DBスキーマと永続化モデルを置く。
- `docs/specs/security/README.md`: 認証、認可、Cookie、CSRF、パスワード、削除保護、セキュリティスキャンを置く。
- `docs/specs/pdf-import/README.md`: PDF取込、抽出、保存、重複判定を置く。
- `docs/specs/backend-architecture/README.md`: バックエンドの詳細設計を置く。
- `docs/specs/frontend-architecture/README.md`: フロントエンドの詳細設計を置く。
- `docs/specs/glossary/README.md`: 用語集を置く。
- `docs/specs/adrs/`: 重要な設計判断の履歴を置く。
- `docs/tests/README.md`: テスト文書の入口。単体テスト、結合テスト、E2Eへの導線を置く。
- `docs/tests/e2e/index.md`: E2Eの入口。実行方法、安定化方針、更新方針への案内を置く。
- `docs/tasks/completed/`: 完了済みタスク履歴の月別アーカイブを置く。

現行の画面スクリーンショットは `docs/designs/` に置き、過去のデザイン案や旧スクリーンショットは `docs/designs/archive/` に退避する。

画面別要件の詳細は現時点では `docs/requirements/` に置く。将来、画面仕様をSSOT配下へ移す場合は、リンク切れが起きないようまとめて移動する。

## 変更時の参照先

- 仕様、設計、画面要件、運用フローを変更する場合は、関連するSSOT文書を同じ作業内で更新する。
- 変更内容ごとの更新先は次を基本とする。
  - 業務ルール、不変条件、集約: `docs/specs/domain-model/README.md`
  - API契約、DTO、ページング、エラー形式: `docs/specs/api-specs/README.md`
  - DB項目、永続化方針: `docs/specs/db-schema/README.md`
  - 認証、認可、Cookie、CSRF、パスワード、削除保護: `docs/specs/security/README.md`
  - PDF取込、抽出、保存、重複判定: `docs/specs/pdf-import/README.md`
  - 開発手順、単体テスト・Integration Test・E2Eの方針、CI、Dependabot: `docs/specs/development-workflow/README.md`
  - レイヤ構成、依存方向、システム境界: `docs/specs/architecture-principles/README.md`
  - 画面の表示、操作、例外状態: `docs/requirements/`
  - E2Eの対象、観点、実行方法: `docs/tests/e2e/index.md` と `docs/tests/e2e/`

## 最重要の横断ルール

- 仕様の正本は `docs/specs/` 配下に置き、`.codex/config.toml` は仕様の正本として扱わない。
- API契約の機械可読な正は FastAPI が生成する OpenAPI とする。
- ドメインルールはバックエンドへ集約し、フロントエンドへ重複実装しない。
- 表示用の共通業務ルールは、画面ごとに重複実装せず、バックエンドまたは共有ヘルパーで一元化する。
- 確認のダイアログは `window.confirm` を使わず、共通UIコンポーネントで統一する。
- 動作確認やテストは Docker Compose のコンテナ内実行を標準とする。

## 詳細への導線

- 開発・運用ルール: [開発・運用ワークフロー](../development-workflow/README.md)
- 横断アーキテクチャ原則: [アーキテクチャ原則](../architecture-principles/README.md)
- ドメイン仕様: [ドメインモデル定義](../domain-model/README.md)
- API仕様: [API仕様](../api-specs/README.md)
- DBスキーマ: [DBスキーマ](../db-schema/README.md)
- セキュリティ仕様: [セキュリティ仕様](../security/README.md)
- PDF取込仕様: [PDF取込仕様](../pdf-import/README.md)
- バックエンド詳細設計: [バックエンド設計](../backend-architecture/README.md)
- フロントエンド詳細設計: [フロントエンド設計](../frontend-architecture/README.md)
