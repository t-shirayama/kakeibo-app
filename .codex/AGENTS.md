# AGENTS.md

## 言語設定

- 日本語で簡潔かつ丁寧に回答してください

## プロジェクトドキュメント

- Codex設定: .codex/config.toml を参照すること
- ドキュメント入口: docs/README.md を最初に参照すること
- 仕様書SSOT: docs/specs/ 配下を参照すること
- プロジェクトルール: docs/specs/project-rules.md を参照すること
- ドメインモデル: docs/specs/domain-model.md を参照すること
- API仕様: docs/specs/api-specs.md を参照すること
- DBスキーマ: docs/specs/db-schema.md を参照すること
- 用語集: docs/specs/glossary.md を参照すること
- バックエンド設計: docs/specs/backend-architecture.md を参照すること
- フロントエンド設計: docs/specs/frontend-architecture.md を参照すること
- PDF取込仕様: docs/specs/pdf-import.md を参照すること
- セキュリティ仕様: docs/specs/security.md を参照すること
- 画面別要件: docs/requirements.md および docs/requirements/ を参照すること

## ドキュメント更新ルール

- 仕様、設計、技術選定、画面要件、データモデル、API、セキュリティ、運用方針を変更した場合は、関連するSSOT文書を同じ作業内で更新すること
- `.codex/config.toml` はSSOTではなくAI向け索引だが、重要な前提や参照先を変更した場合は同期すること
- アーキテクチャ上の重要な決定を追加・変更した場合は `docs/specs/adrs/` にADRを追加または更新すること
- 画面の振る舞い、表示項目、操作、例外状態を変更した場合は `docs/requirements/` の該当画面要件を更新すること
- API仕様を変更した場合は `docs/specs/api-specs.md` を更新すること
- DB項目や永続化方針を変更した場合は `docs/specs/db-schema.md` を更新すること
- ドメイン概念、不変条件、業務ルールを変更した場合は `docs/specs/domain-model.md` を更新すること
- セキュリティ、認証、認可、Cookie、CSRF、パスワード、ファイルアップロードの方針を変更した場合は `docs/specs/security.md` を更新すること
- PDF取込、抽出、重複判定、保存方針を変更した場合は `docs/specs/pdf-import.md` を更新すること
- 用語を追加・変更した場合は `docs/specs/glossary.md` を更新すること
- ドキュメント更新後は `rg "確認事項|未決定事項|TODO|TBD|要確認" docs .codex -g "*.md" -g "*.toml"` を実行し、意図しない未確定事項が残っていないか確認すること
- 最終回答では、変更したドキュメントと、同期確認を行ったことを簡潔に報告すること

## アーキテクチャ方針

- ドメイン駆動設計（DDD）を採用すること
- バックエンドは FastAPI、フロントエンドは Next.js で開発すること
- フロントエンドは Next.js App Router を使うこと
- データベースは MySQL 8.4 を使うこと
- ORMは SQLAlchemy、マイグレーションは Alembic を使うこと
- 認証はJWTを使うこと
- JWTは HttpOnly Cookie に保存し、リフレッシュトークンを使うこと
- JWTのアクセストークンは15分、リフレッシュトークンは5日、ローテーションありにすること
- CSRF対策として SameSite=Lax とCSRFトークンヘッダーを使うこと
- CSRFトークンは GET /api/auth/csrf で取得すること
- CSRFトークンはCookieには持たせず、レスポンスボディのみで返すこと
- DB日時はUTC保存、表示時はAsia/Tokyo変換にすること
- 金額は整数JPYで、マイナス金額は取消明細を表すこと
- 0円明細を許可すること
- 明細、カテゴリ、アップロード履歴は論理削除すること
- エクスポート形式はExcel（.xlsx）にすること
- 実装時は docs/specs/project-rules.md のレイヤ構成、依存関係、ドメインモデルのルールに従うこと
