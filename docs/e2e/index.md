# E2Eテスト

このドキュメントは、フルスタックE2Eの入口として、目的、実行方法、環境、安定化方針、更新方針をまとめる。

テスト方針全体の正本は `../specs/project-rules.md` とし、このドキュメントにはE2Eに固有の詳細を置く。シナリオ詳細は必要なものだけ読めるように同じディレクトリ配下へ分割する。

## 目的

Playwrightで Next.js、FastAPI、MySQL を実際に接続し、ユーザー操作からAPI、認証Cookie、DB永続化までの結合を確認する。

E2Eでは単体テストやAPIテストで検証済みの細かい分岐を重複して網羅しない。画面操作、認証、CSRF、Cookie、API接続、主要データ表示、破壊的操作のガードなど、結合時に壊れやすい観点を優先する。

## 実行方法

前提:

- Docker Desktopを起動しておく。
- 初回、またはDockerfileや依存関係を変更した場合は、E2E用イメージを再ビルドする: `docker compose build e2e`

通常実行:

```powershell
docker compose run --rm e2e
```

デバッグ:

```powershell
docker compose run --rm e2e npm run test:e2e:headed
docker compose run --rm e2e npm run test:e2e:ui
```

ホスト側で既に開発サーバーが `3000` / `8000` 番で起動していても、E2Eはコンテナ内でバックエンドとフロントエンドを起動するため、通常はポート変更不要とする。ホストからE2E中の画面へ接続して確認したい場合だけ、必要に応じてポート公開や別ポートを設定する。

```powershell
docker compose run --rm -p 3100:3100 -e E2E_FRONTEND_PORT=3100 -e E2E_BASE_URL=http://127.0.0.1:3100 e2e
```

## データと環境

- E2Eは `docker compose run --rm e2e` で実行し、`frontend/playwright.config.ts` からコンテナ内のバックエンドとフロントエンドを起動する。
- E2E専用DBは既定で `kakeibo_e2e` を使う。
- 実行前に `frontend/scripts/reset-e2e-db.mjs` がE2E専用DBを作り直し、Alembic `upgrade head` でサンプルユーザーとサンプルデータを投入する。
- `frontend/scripts/e2e-runtime.mjs` は E2E 用の Python 解決、環境変数組み立て、コマンド実行を共通化し、`reset-e2e-db.mjs` と `start-backend-e2e.mjs` から使う。
- DB作成と権限付与には `E2E_ADMIN_DATABASE_URL` を使う。Docker Composeでは `mysql+pymysql://root:root_password@mysql:3306/mysql` を使う。
- 通常の開発DB `kakeibo` は変更しない。
- 認証には `sample@example.com` / `SamplePassw0rd!` を使う。
- ログイン済み状態は `e2e/.auth/sample-user.json` に保存する。このファイルはコミットしない。

## シナリオ詳細

- [認証](auth.md): ログイン、未ログインリダイレクト、認証切れ時のログイン誘導。
- [ナビゲーション](navigation.md): サイドナビから主要画面へ遷移できること。
- [ダッシュボード](dashboard.md): 指標、カテゴリ別支出、最近の明細の表示。
- [カレンダー](calendar.md): 日別支出カレンダー、カテゴリ別サマリー、選択日の明細表示。
- [明細一覧](transactions.md): 検索、絞り込み、未分類表示、追加、編集、削除、Excelエクスポート。
- [収入設定](income-settings.md): 収入設定の追加、月別変更、削除。
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
- `frontend/e2e/helpers/` に、ログイン、ページ遷移、年月操作、明細追加、アップロード用PDF生成のような共通操作をまとめ、spec側で重複実装しない。

## 更新方針

コード変更時は、変更が影響するテスト層を同じ作業内で更新する。

- ドメインルールや値オブジェクトを変更した場合は、該当する単体テストを更新する。
- ユースケース、リポジトリ、API契約を変更した場合は、アプリケーション/API/リポジトリのテストを更新する。
- 画面の表示、操作、遷移、API接続、認証導線、エクスポート、主要なユーザーフローを変更した場合は、E2Eと該当するシナリオファイルを更新する。
- E2Eの対象外にする場合は、既存の単体テスト/APIテストで同じリスクを検証できる理由をPRや作業メモに残す。

E2Eを追加・修正した場合は、少なくとも次を確認する。

```powershell
docker compose run --rm e2e
```

関連する通常チェックも必要に応じて実行する。

```powershell
docker compose run --rm --no-deps frontend npm run typecheck
docker compose run --rm --no-deps frontend npm run test:pages
docker compose run --rm --no-deps frontend npm run build
```
