# E2Eテスト

このドキュメントは、フルスタックE2Eの入口として、目的、実行方法、環境、安定化方針、更新方針をまとめる。

テスト方針全体の正本は `../specs/project-rules.md` とし、このドキュメントにはE2Eに固有の詳細を置く。シナリオ詳細は必要なものだけ読めるように同じディレクトリ配下へ分割する。

## 目的

Playwrightで Next.js、FastAPI、MySQL を実際に接続し、ユーザー操作からAPI、認証Cookie、DB永続化までの結合を確認する。

E2Eでは単体テストやAPIテストで検証済みの細かい分岐を重複して網羅しない。画面操作、認証、CSRF、Cookie、API接続、主要データ表示、破壊的操作のガードなど、結合時に壊れやすい観点を優先する。

## 実行方法

前提:

- MySQLを起動しておく: `docker compose up -d mysql`
- バックエンド依存、フロントエンド依存、DBマイグレーションを準備しておく: `npm run setup`
- 初回のみPlaywrightブラウザをインストールする: `cd frontend` 後に `npx playwright install chromium`

通常実行:

```powershell
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

## シナリオ詳細

- [認証](auth.md): ログイン、未ログインリダイレクト、認証切れ時のログイン誘導。
- [ナビゲーション](navigation.md): サイドナビから主要画面へ遷移できること。
- [ダッシュボード](dashboard.md): 指標、カテゴリ別支出、最近の明細の表示。
- [明細一覧](transactions.md): 検索、絞り込み、未分類表示、追加、編集、削除、Excelエクスポート。
- [カテゴリ管理](categories.md): カテゴリ表示、追加、編集、無効化、有効化、削除、未分類確認リンク。
- [アップロード](upload.md): アップロード画面と取込履歴の表示。
- [レポート](reports.md): 月別支出、カテゴリ別サマリー、Excelエクスポート。
- [設定](settings.md): 設定表示、保存、全データ削除ガード。

## 安定化方針

- E2EはDBを共有するため、Playwrightは `workers: 1` とし、テストは直列に実行する。
- 実行前にE2E専用DBを作り直し、サンプルデータへ戻す。
- E2E専用のJWT秘密鍵は32バイト以上の固定値を使い、鍵長警告によるログノイズを避ける。
- `expect` の既定タイムアウトは10秒、各テストのタイムアウトは60秒とする。
- 失敗時はtrace、スクリーンショット、動画を保存し、通常成功時には成果物を残さない。
- テストが作成したデータは同じテスト内で削除するか、次回実行時のDBリセットに依存できるE2E専用DBだけで扱う。
- 開発サーバーとE2Eを同じポートで同時起動しない。必要な場合は `E2E_BACKEND_PORT` / `E2E_FRONTEND_PORT` を指定する。

## 更新方針

コード変更時は、変更が影響するテスト層を同じ作業内で更新する。

- ドメインルールや値オブジェクトを変更した場合は、該当する単体テストを更新する。
- ユースケース、リポジトリ、API契約を変更した場合は、アプリケーション/API/リポジトリのテストを更新する。
- 画面の表示、操作、遷移、API接続、認証導線、エクスポート、主要なユーザーフローを変更した場合は、E2Eと該当するシナリオファイルを更新する。
- E2Eの対象外にする場合は、既存の単体テスト/APIテストで同じリスクを検証できる理由をPRや作業メモに残す。

E2Eを追加・修正した場合は、少なくとも次を確認する。

```powershell
npm run test:e2e
```

関連する通常チェックも必要に応じて実行する。

```powershell
npm run test:frontend
npm run build:frontend
```
