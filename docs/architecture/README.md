# アーキテクチャ

このディレクトリは、全体の技術スタック、システム境界、実装構成、重要な設計判断の履歴を管理する入口です。

## 主要技術スタック

- フロントエンド: Next.js App Router、shadcn/ui、Tailwind CSS、TanStack Query
- バックエンド: FastAPI、DDD、SQLAlchemy、Alembic
- DB: MySQL 8.4
- 認証: JWT、HttpOnly Cookie、refresh token rotation
- API契約: FastAPI OpenAPI
- PDF抽出: PyMuPDF

## 参照順

1. [アーキテクチャ全体像](overview/README.md)
2. [バックエンド設計](backend/README.md)
3. [フロントエンド設計](frontend/README.md)
4. [ADR](adrs/README.md)

## 更新先

- 技術スタック、システム境界、全体構成を変更する場合は [アーキテクチャ全体像](overview/README.md) を更新します。
- バックエンドのフォルダ構成、責務分離、実行時構成を変更する場合は [バックエンド設計](backend/README.md) を更新します。
- フロントエンドのフォルダ構成、状態管理、API呼び出し方針を変更する場合は [フロントエンド設計](frontend/README.md) を更新します。
- 重要な設計判断を追加・変更する場合は [ADR](adrs/README.md) を追加または更新します。
