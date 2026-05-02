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
- [実装タスク](docs/tasks.md)

## ローカル開発

### 前提ツール

- Docker Desktop
- Python 3.12 以上
- Node.js 20 以上
- npm

macOS標準の `python3` は古い場合があります。`python3 --version` が `3.12` 未満の場合は、HomebrewなどでPython 3.12以上をインストールし、以降の手順では `python3.12` を使ってください。

### 初回セットアップ

初回は環境変数サンプルをコピーして、必要な値を調整します。

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS / Linux:

```bash
cp .env.example .env
```

### Docker Composeでアプリ全体を起動する

Docker Desktop があれば、MySQL、バックエンド、フロントエンドをまとめて起動できます。バックエンド起動時に `alembic upgrade head` を自動実行するため、初回起動後にサンプルユーザーとサンプルデータをそのまま確認できます。

普段の起動:

```powershell
docker compose up
```

バックグラウンドで起動する場合:

```powershell
docker compose up -d
```

初回起動時、またはDockerイメージの再作成が必要な変更を入れた場合:

```powershell
docker compose up --build
```

`--build` が必要になる主な変更は以下です。

- `Dockerfile` を変更した
- `docker-compose.yml` を変更した
- `backend/requirements.txt` などバックエンド依存を変更した
- `frontend/package.json` や `frontend/package-lock.json` などフロントエンド依存を変更した
- コンテナ内で使う起動スクリプトや環境設定を変更した

アプリのコードだけを変更した場合は、開発用コンテナのホットリロードで反映されるため、通常は `--build` なしの `docker compose up` で十分です。

確認先:

- フロントエンド: http://localhost:3000
- Swagger UI: http://localhost:8000/docs
- Health Check: http://localhost:8000/api/health
- CSRF Token: http://localhost:8000/api/auth/csrf

停止:

```powershell
docker compose down
```

MySQLデータも含めて初期化する場合:

```powershell
docker compose down -v
```

### ローカルランタイムで起動する

PythonとNode.jsをホスト側に入れて開発する場合は、MySQL 8.4 だけを Docker Compose で起動します。

Windows PowerShell / macOS:

```powershell
docker compose up -d mysql
```

バックエンド依存、フロントエンド依存、DBマイグレーションをまとめて準備します。

Windows PowerShell:

```powershell
npm run setup
```

macOS / Linux:

```bash
npm run setup
```

依存関係が更新された場合も `npm run setup` を再実行してください。MySQL 8.4 の認証方式に対応するため、バックエンド依存には `cryptography` を含めています。

DBマイグレーションだけを適用する場合:

```powershell
npm run migrate
```

### ローカルランタイムでのアプリ起動

バックエンドとフロントエンドをまとめて起動します。

```powershell
npm run dev
```

個別に起動する場合:

```powershell
npm run dev:backend
npm run dev:frontend
```

確認先:

- Swagger UI: http://localhost:8000/docs
- Health Check: http://localhost:8000/api/health
- CSRF Token: http://localhost:8000/api/auth/csrf
- フロントエンド: http://localhost:3000

### 動作確認用ログイン

`alembic upgrade head` を実行すると、全画面確認用のサンプルユーザーとサンプルデータが投入されます。

| 項目           | 値                   |
| -------------- | -------------------- |
| メールアドレス | `sample@example.com` |
| パスワード     | `SamplePassw0rd!`    |

サンプルデータには、カテゴリ、明細、アップロード履歴、ユーザー設定、監査ログが含まれます。明細は2025年12月から2026年5月まで配置しているため、ダッシュボード、明細一覧、カテゴリ管理、アップロード、レポート、設定、Excelエクスポートの確認に使えます。

主な画面:

- http://localhost:3000
- http://localhost:3000/dashboard
- http://localhost:3000/transactions
- http://localhost:3000/categories
- http://localhost:3000/upload
- http://localhost:3000/reports
- http://localhost:3000/settings
- http://localhost:3000/login

### 静的チェック

動作確認やテストは、ホスト側のPython/Nodeに依存しないようDocker Composeのコンテナ内で実行します。

バックエンド:

```powershell
docker compose run --rm backend python -m pytest
```

フロントエンド:

```powershell
docker compose run --rm --no-deps frontend npm run typecheck
docker compose run --rm --no-deps frontend npm run test:pages
docker compose run --rm --no-deps frontend npm run build
```

### E2Eテスト

Playwrightで、Next.js + FastAPI + MySQL を使ったフルスタックE2Eを実行できます。

前提:

- Docker Desktopを起動しておく。
- 初回、またはDockerfileや依存関係を変更した場合は、E2E用イメージを再ビルドする: `docker compose build e2e`

実行:

```powershell
docker compose run --rm e2e
```

デバッグ用:

```powershell
docker compose run --rm e2e npm run test:e2e:headed
docker compose run --rm e2e npm run test:e2e:ui
```

E2Eは既定で `kakeibo_e2e` を使い、実行前にDBを作成して Alembic の `downgrade base` → `upgrade head` でサンプルデータへ戻します。通常の開発DB `kakeibo` は変更しません。Docker Composeでは接続先に `mysql` サービスを使います。

E2Eの実行方法と安定化方針は [docs/e2e.md](docs/e2e.md)、シナリオ詳細は `docs/e2e/` 配下を参照してください。

ホスト側で既に開発用のバックエンドやフロントエンドが起動していても、E2Eはコンテナ内でサーバーを起動するため通常はポート変更不要です。ホストからE2E中の画面へ接続して確認したい場合だけ、次のようにポートを公開してください。

```powershell
docker compose run --rm -p 3100:3100 -e E2E_FRONTEND_PORT=3100 -e E2E_BASE_URL=http://127.0.0.1:3100 e2e
```

開発用の `frontend` サービス起動中にフロントエンドビルドやE2Eを同じ `.next` ボリュームに対して同時実行すると、Next.js のチャンクが入れ替わってブラウザ側で `ChunkLoadError` が出ることがあります。その場合は dev サーバーを再起動してください。

まずはアプリが起動すること、Swagger UIが表示されること、主要画面が表示されることを確認します。

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

`.codex/config.toml` はAI向けの索引です。正本ではありませんが、重要な前提や参照先を変更した場合は同期してください。

## 現在の状態

現時点では、仕様整理を終えて実装の土台作成に入っています。完了状況は [docs/tasks.md](docs/tasks.md) で管理します。
