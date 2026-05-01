# E2Eテスト

このドキュメントは、フルスタックE2Eの目的、実行方法、シナリオ、更新方針をまとめる。

## 目的

Playwrightで Next.js、FastAPI、MySQL を実際に接続し、ユーザー操作からAPI、認証Cookie、DB永続化までの結合を確認する。

E2Eでは単体テストやAPIテストで検証済みの細かい分岐を重複して網羅しない。画面操作、認証、CSRF、Cookie、API接続、主要データ表示、破壊的操作のガードなど、結合時に壊れやすい観点を優先する。

## 実行方法

前提:

- MySQLを起動しておく: `docker compose up -d mysql`
- バックエンド依存をインストールしておく: `cd backend` 後に `python -m pip install -e ".[dev]"`
- フロントエンド依存をインストールしておく: `cd frontend` 後に `npm install`
- 初回のみPlaywrightブラウザをインストールする: `cd frontend` 後に `npx playwright install chromium`

通常実行:

```powershell
cd frontend
npm run test:e2e
```

デバッグ:

```powershell
npm run test:e2e:headed
npm run test:e2e:ui
```

既に開発サーバーが `3000` / `8000` 番で起動している場合は停止するか、別ポートで実行する。

```powershell
$env:E2E_BACKEND_PORT="18000"
$env:E2E_API_BASE_URL="http://127.0.0.1:18000"
$env:E2E_FRONTEND_PORT="3100"
$env:E2E_BASE_URL="http://127.0.0.1:3100"
npm run test:e2e
```

## データと環境

- E2Eは `frontend/playwright.config.ts` からバックエンドとフロントエンドを起動する。
- E2E専用DBは既定で `kakeibo_e2e` を使う。
- 実行前に `frontend/scripts/reset-e2e-db.mjs` がE2E専用DBを作り直し、Alembic `upgrade head` でサンプルユーザーとサンプルデータを投入する。
- DB作成と権限付与には `E2E_ADMIN_DATABASE_URL` を使う。未指定時は `mysql+pymysql://root:root_password@localhost:3306/mysql` を使う。
- 通常の開発DB `kakeibo` は変更しない。
- 認証には `sample@example.com` / `SamplePassw0rd!` を使う。
- ログイン済み状態は `e2e/.auth/sample-user.json` に保存する。このファイルはコミットしない。

## テスト構成

- `auth.setup.ts`
  - サンプルユーザーでログインし、通常画面テスト用の認証状態を保存する。
- `auth.spec.ts`
  - 未ログイン時の保護画面リダイレクトを確認する。
  - サンプルユーザーでログインできることを確認する。
  - APIが401を返し、refreshも失敗した場合にログイン画面へ戻ることを確認する。
- `navigation.spec.ts`
  - サイドナビから主要画面へ遷移できることを確認する。
- `dashboard.spec.ts`
  - 指標、カテゴリ別支出、最近の明細が表示されることを確認する。
- `transactions.spec.ts`
  - 明細検索、手動追加、編集、削除、Excelエクスポートを確認する。
- `categories.spec.ts`
  - 初期カテゴリとカテゴリ色、カテゴリ追加を確認する。
- `upload.spec.ts`
  - サンプルのアップロード履歴、成功/失敗状態、取込件数、失敗理由を確認する。
- `reports.spec.ts`
  - 月別支出、カテゴリ別サマリー、Excelエクスポートを確認する。
- `settings.spec.ts`
  - 設定値の表示、保存、全データ削除UIのガードを確認する。

## 更新方針

コード変更時は、変更が影響するテスト層を同じ作業内で更新する。

- ドメインルールや値オブジェクトを変更した場合は、該当する単体テストを更新する。
- ユースケース、リポジトリ、API契約を変更した場合は、アプリケーション/API/リポジトリのテストを更新する。
- 画面の表示、操作、遷移、API接続、認証導線、エクスポート、主要なユーザーフローを変更した場合は、E2Eを更新する。
- E2Eの対象外にする場合は、既存の単体テスト/APIテストで同じリスクを検証できる理由をPRや作業メモに残す。

E2Eを追加・修正した場合は、少なくとも次を確認する。

```powershell
cd frontend
npm run test:e2e
```

関連する通常チェックも必要に応じて実行する。

```powershell
npm run typecheck
npm run test:pages
npm run build
```
