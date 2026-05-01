# AGENTS.md

## 言語設定

- 日本語で簡潔かつ丁寧に回答してください

## プロジェクトドキュメント

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

## アーキテクチャ方針

- ドメイン駆動設計（DDD）を採用すること
- バックエンドは FastAPI、フロントエンドは Next.js で開発すること
- フロントエンドは Next.js App Router を使うこと
- データベースは MySQL 8.4 を使うこと
- ORMは SQLAlchemy、マイグレーションは Alembic を使うこと
- 認証はJWTを使うこと
- JWTは HttpOnly Cookie に保存し、リフレッシュトークンを使うこと
- 実装時は docs/specs/project-rules.md のレイヤ構成、依存関係、ドメインモデルのルールに従うこと
