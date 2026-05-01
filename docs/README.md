# ドキュメント

このディレクトリはプロジェクトドキュメントの入口です。

実装や仕様確認で迷った場合は、まずこのファイルを読み、次に `docs/specs/project-rules.md` を確認してください。

## 構成

```text
docs/
├── README.md
├── designs/
├── requirements.md
├── requirements/
└── specs/
    ├── domain-model.md
    ├── api-specs.md
    ├── db-schema.md
    ├── glossary.md
    ├── project-rules.md
    └── adrs/
```

## 仕様書SSOT

仕様書の正本は `docs/specs/` 配下に置きます。

- [プロジェクトルール](specs/project-rules.md)
- [ドメインモデル定義](specs/domain-model.md)
- [API仕様](specs/api-specs.md)
- [DBスキーマ](specs/db-schema.md)
- [用語集](specs/glossary.md)
- [バックエンド設計](specs/backend-architecture.md)
- [フロントエンド設計](specs/frontend-architecture.md)
- [PDF取込仕様](specs/pdf-import.md)
- [セキュリティ仕様](specs/security.md)
- [ADR](specs/adrs/)

## 画面要件

画面別要件は [requirements.md](requirements.md) を入口にして確認します。

画面デザイン画像は `docs/designs/` 配下に置きます。

実装タスクは [tasks.md](tasks.md) を参照してください。

## 重要な前提

- アーキテクチャはドメイン駆動設計（DDD）を採用します。
- バックエンドは FastAPI で開発します。
- フロントエンドは Next.js で開発します。
- フロントエンドは Next.js App Router を使います。
- データベースは MySQL 8.4 を使います。
- 認証はJWTを使います。
- JWTは HttpOnly Cookie に保存し、リフレッシュトークンを使います。
- PDF原本は初期は `storage/uploads/` に保存します。
- 最大アップロードサイズは10MBです。
- エクスポート形式はExcel（`.xlsx`）です。
- 0円明細を許可します。
- ドメインルールはバックエンドのドメイン層に集約します。
