# プロジェクトルール

## この文書の役割

この文書は、`docs/specs/` 全体の入口として、参照導線と最重要の横断ルールだけをまとめる。

詳細な開発・運用ルールは `development-workflow.md`、横断的な設計原則は `architecture-principles.md`、業務仕様は各SSOTを参照する。

## ドキュメント構成

`docs/specs/` を仕様書のSSOTとする。

関連ファイルの役割は以下とする。

- `docs/specs/project-rules.md`: SSOT全体の入口と、更新先の判断基準を置く。
- `docs/specs/development-workflow.md`: 仕様更新、単体テスト・Integration Test・E2Eの方針、Docker Compose での確認、CI、Dependabot運用を置く。
- `docs/specs/architecture-principles.md`: 技術スタック、レイヤ構成、依存方向、システム境界を置く。
- `docs/specs/domain-model.md`: ドメイン概念、不変条件、業務ルールを置く。
- `docs/specs/api-specs.md`: APIの共通契約とエンドポイント概要を置く。
- `docs/specs/db-schema.md`: DBスキーマと永続化モデルを置く。
- `docs/specs/security.md`: 認証、認可、Cookie、CSRF、パスワード、削除保護、セキュリティスキャンを置く。
- `docs/specs/pdf-import.md`: PDF取込、抽出、保存、重複判定を置く。
- `docs/specs/backend-architecture.md`: バックエンドの詳細設計を置く。
- `docs/specs/frontend-architecture.md`: フロントエンドの詳細設計を置く。
- `docs/specs/glossary.md`: 用語集を置く。
- `docs/specs/adrs/`: 重要な設計判断の履歴を置く。
- `docs/README.md`: 人間向けのドキュメント入口。参照先の案内を置く。
- `.codex/AGENTS.md`: Codex向けの最小ルールと参照索引。仕様本文は置かない。
- `.codex/config.toml`: Codexのローカル実行設定。プロジェクト仕様のSSOTではない。
- `docs/e2e/index.md`: E2Eの入口。実行方法、安定化方針、更新方針への案内を置く。
- `docs/e2e.md`: 既存リンク互換用の案内ファイル。E2Eの正規入口へ誘導する。
- `docs/e2e/`: E2Eのシナリオ詳細を置く。

現行の画面スクリーンショットは `docs/designs/` に置き、過去のデザイン案や旧スクリーンショットは `docs/designs/archive/` に退避する。

画面別要件の詳細は現時点では `docs/requirements/` に置く。将来、画面仕様をSSOT配下へ移す場合は、リンク切れが起きないようまとめて移動する。

## 変更時の参照先

- 仕様、設計、画面要件、運用フローを変更する場合は、関連するSSOT文書を同じ作業内で更新する。
- 変更内容ごとの更新先は次を基本とする。
  - 業務ルール、不変条件、集約: `domain-model.md`
  - API契約、DTO、ページング、エラー形式: `api-specs.md`
  - DB項目、永続化方針: `db-schema.md`
  - 認証、認可、Cookie、CSRF、パスワード、削除保護: `security.md`
  - PDF取込、抽出、保存、重複判定: `pdf-import.md`
  - 開発手順、単体テスト・Integration Test・E2Eの方針、CI、Dependabot: `development-workflow.md`
  - レイヤ構成、依存方向、システム境界: `architecture-principles.md`
  - 画面の表示、操作、例外状態: `docs/requirements/`
  - E2Eの対象、観点、実行方法: `docs/e2e/index.md` と `docs/e2e/`

## 最重要の横断ルール

- 仕様の正本は `docs/specs/` 配下に置き、`.codex/config.toml` は仕様の正本として扱わない。
- API契約の機械可読な正は FastAPI が生成する OpenAPI とする。
- ドメインルールはバックエンドへ集約し、フロントエンドへ重複実装しない。
- 表示用の共通業務ルールは、画面ごとに重複実装せず、バックエンドまたは共有ヘルパーで一元化する。
- 確認のダイアログは `window.confirm` を使わず、共通UIコンポーネントで統一する。
- 動作確認やテストは Docker Compose のコンテナ内実行を標準とする。

## 詳細への導線

- 開発・運用ルール: `development-workflow.md`
- 横断アーキテクチャ原則: `architecture-principles.md`
- ドメイン仕様: `domain-model.md`
- API仕様: `api-specs.md`
- DBスキーマ: `db-schema.md`
- セキュリティ仕様: `security.md`
- PDF取込仕様: `pdf-import.md`
- バックエンド詳細設計: `backend-architecture.md`
- フロントエンド詳細設計: `frontend-architecture.md`
