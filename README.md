# kakeibo-app

PDF明細を取り込み、支出・収入明細、カテゴリ、レポートを管理する家計簿アプリです。

このリポジトリでは、仕様書の正本を `docs/specs/` に集約しています。実装前にまず [docs/README.md](docs/README.md) と [docs/specs/project-rules.md](docs/specs/project-rules.md) を確認してください。

## 概要

主な機能は以下です。

- 楽天カード明細PDFのアップロードと明細取込
- 明細一覧、明細編集、カテゴリ管理
- 月別・週別・年別レポート
- Excel（`.xlsx`）エクスポート
- JWT認証
- 監査ログ

## 技術スタック

| 領域            | 採用技術                                     |
| --------------- | -------------------------------------------- |
| フロントエンド  | Next.js App Router                           |
| UI              | shadcn/ui, Tailwind CSS                      |
| 状態管理        | TanStack Query                               |
| バックエンド    | FastAPI                                      |
| アーキテクチャ  | DDD                                          |
| DB              | MySQL 8.4                                    |
| ORM / Migration | SQLAlchemy / Alembic                         |
| 認証            | JWT, HttpOnly Cookie, refresh token rotation |
| PDF抽出         | PyMuPDF                                      |
| API仕様         | FastAPI OpenAPI / Swagger UI                 |

## ドキュメント

仕様書の正本は `docs/specs/` 配下です。

- [ドキュメント入口](docs/README.md)
- [プロジェクトルール](docs/specs/project-rules.md)
- [ドメインモデル](docs/specs/domain-model.md)
- [API仕様](docs/specs/api-specs.md)
- [DBスキーマ](docs/specs/db-schema.md)
- [バックエンド設計](docs/specs/backend-architecture.md)
- [フロントエンド設計](docs/specs/frontend-architecture.md)
- [PDF取込仕様](docs/specs/pdf-import.md)
- [セキュリティ仕様](docs/specs/security.md)
- [用語集](docs/specs/glossary.md)
- [ADR](docs/specs/adrs/)
- [画面別要件](docs/requirements.md)
- [画面デザイン](docs/designs/)
- [タスク管理](docs/tasks/)

## ローカル開発

### クイックスタート

前提ツールは Docker Desktop です。ルートのnpmエイリアスを使う場合だけ、ホスト側に Node.js 20 以上と npm が必要です。

初回は環境変数サンプルをコピーして、必要な値を調整します。

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS / Linux:

```bash
cp .env.example .env
```

アプリ全体を起動します。

```powershell
docker compose up
```

初回起動時、またはDockerイメージの再作成が必要な変更を入れた場合は `--build` を付けます。

```powershell
docker compose up --build
```

確認先:

- フロントエンド: http://localhost:3000
- Swagger UI: http://localhost:8000/docs
- Health Check: http://localhost:8000/api/health

停止と初期化:

```powershell
docker compose down
docker compose down -v
```

ホスト側にNode.jsがある場合は、ルートのnpm scriptsをDocker Composeコマンドの短縮形として使えます。

```powershell
npm run dev
npm run test:backend
npm run test:frontend
npm run test:e2e
```

### 動作確認用ログイン

`alembic upgrade head` を実行すると、全画面確認用のサンプルユーザーとサンプルデータが投入されます。

| 項目 | 値 |
| --- | --- |
| メールアドレス | `sample@example.com` |
| パスワード | `SamplePassw0rd!` |

### テスト

動作確認やテストは、ホスト側のPython/Nodeに依存しないようDocker Composeのコンテナ内で実行します。

```powershell
docker compose run --rm backend python -m pytest
docker compose run --rm --no-deps frontend npm run typecheck
docker compose run --rm --no-deps frontend npm run test:pages
docker compose run --rm --no-deps frontend npm run build
docker compose run --rm e2e
```

E2Eの実行方法、デバッグ、安定化方針、シナリオ詳細は [docs/e2e/index.md](docs/e2e/index.md) を参照してください。

## 重要な仕様

- 金額は整数JPYで扱います。
- マイナス金額は取消明細を表します。
- 0円明細を許可します。
- DB日時はUTCで保存し、表示時にAsia/Tokyoへ変換します。
- PDF原本は `storage/uploads/{user_id}/{upload_id}/original.pdf` の相対パスで保存します。
- アップロード履歴を論理削除した場合、PDF原本は即削除します。
- 明細、カテゴリ、アップロード履歴は論理削除します。
- Excel出力には明細一覧、カテゴリ集計、月別集計を含めます。
- APIエラーは `error.code`, `error.message`, `error.details`, `error.request_id` の共通形式で返します。

## 初期リリースで実装しないもの

- メール通知
- 多通貨対応
- S3互換ストレージ移行
- ダークモードの表示切り替え

## 開発ルール

仕様、設計、技術選定、画面要件、データモデル、API、セキュリティ、運用方針を変更した場合は、関連するSSOT文書を同じ作業内で更新してください。

更新後は以下で未確定事項が残っていないか確認します。

```powershell
rg "確認事項|未決定事項|TODO|TBD|要確認" docs .codex -g "*.md" -g "*.toml"
```

`.codex/config.toml` はCodexのローカル実行設定です。仕様の正本ではないため、Codexの参照入口、プロジェクトルート判定、承認・サンドボックス方針を変更した場合だけ同期してください。

## 現在の状態

現時点の未完了タスクは [docs/tasks/open.md](docs/tasks/open.md) で管理します。完了済みタスクは [docs/tasks/completed.md](docs/tasks/completed.md) に退避しています。
