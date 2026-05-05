# E2Eテスト

このドキュメントは、フルスタックE2Eの入口として、目的、実行方法、環境、安定化方針、更新方針をまとめる。

テスト方針全体の正本は `../specs/development-workflow.md` とし、このドキュメントにはE2Eに固有の詳細を置く。シナリオ詳細は必要なものだけ読めるように同じディレクトリ配下へ分割する。

## 目的

Playwrightで Next.js、FastAPI、MySQL を実際に接続し、ユーザー操作からAPI、認証Cookie、DB永続化までの結合を確認する。

E2Eでは単体テストやIntegration Testで検証済みの細かい分岐を重複して網羅しない。画面操作、認証、CSRF、Cookie、実バックエンドとのAPI接続、主要データ表示、破壊的操作のガードなど、フルスタック結合時に壊れやすい観点を優先する。

Backend Integration Test は `backend/tests/integration/` の FastAPI + MySQL を通す API 結合テストとして扱い、認証・CSRF・明細操作・月次集計の最重要経路を E2E より小さく確認する。バックエンドの単体寄りテストは `backend/tests/unit/` に分けて置く。Frontend Integration Test は `frontend/src/test/integration/` に置き、Vitest / React Testing Library / MSW による API mock 前提の画面結合テストとして扱う。フロントエンドの単体テストは `frontend/src/test/unit/` に置く。E2Eは実ブラウザ、実バックエンド、MySQL、Cookieを含む代表導線に集中し、細かいエラー分岐や表示再取得は Integration Test へ寄せる。具体的には、明細フォームの一括更新確認、PDFアップロード進捗と再試行UI、CSRF 403 後の再試行、401 後の refresh 失敗時ログイン誘導は Integration Test を主とし、E2Eでは代表導線と実接続確認を優先する。

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

- E2Eは `docker compose run --rm e2e` で実行し、`frontend/playwright.config.ts` からコンテナ内のバックエンドと production build 済みフロントエンドを起動する。
- E2E専用DBは既定で `kakeibo_e2e` を使う。
- 実行前に `frontend/scripts/reset-e2e-db.mjs` がE2E専用DBを作り直し、Alembic `upgrade head` でサンプルユーザーとサンプルデータを投入する。
- `frontend/scripts/e2e-runtime.mjs` は E2E 用の Python 解決、環境変数組み立て、コマンド実行を共通化し、`reset-e2e-db.mjs` と `start-backend-e2e.mjs` から使う。
- DB作成と権限付与には `E2E_ADMIN_DATABASE_URL` を使う。Docker Composeでは `mysql+pymysql://root:root_password@mysql:3306/mysql` を使う。
- 通常の開発DB `kakeibo` は変更しない。
- 認証には `sample@example.com` / `SamplePassw0rd!` を使う。
- ログイン済み状態は `e2e/.auth/sample-user.json` に保存する。このファイルはコミットしない。

## シナリオ詳細

- [認証](auth.md): ログイン、未ログインリダイレクト。
- [ナビゲーション](navigation.md): サイドナビから主要画面へ遷移できること。
- [ダッシュボード](dashboard.md): 指標、カテゴリ別支出、最近の明細の表示。
- [カレンダー](calendar.md): 日別支出カレンダー、カテゴリ別サマリー、選択日の明細表示。
- [明細一覧](transactions.md): 検索、絞り込み、未分類表示、追加、編集、削除、Excelエクスポート。
- [収入設定](income-settings.md): 収入設定の追加、月別変更、削除。
- [予算管理](budgets.md): 予算設定タブと予実確認タブの切り替え、表示月切り替え。
- [カテゴリ管理](categories.md): カテゴリ表示、追加、編集、無効化、有効化、削除、未分類確認リンク。
- [アップロード](upload.md): アップロード画面と取込履歴の表示。
- [レガシーレポート導線](reports.md): `/reports` からダッシュボードへ遷移し、従来の導線でExcelエクスポートできること。
- [設定](settings.md): 設定表示、保存、全データ削除ガード。

## 安定化方針

- E2EはDBを共有するため、Playwrightは `workers: 1` とし、テストは直列に実行する。
- 実行前にE2E専用DBを作り直し、サンプルデータへ戻す。
- フロントエンドは `next dev` ではなく `npm run build && next start` で起動し、開発サーバー固有のコンパイル待ちや HMR 起因の揺れを避ける。
- E2E専用のJWT秘密鍵は32バイト以上の固定値を使い、鍵長警告によるログノイズを避ける。
- `expect` の既定タイムアウトは10秒、各テストのタイムアウトは60秒とする。
- 失敗時はtrace、スクリーンショット、動画を保存し、通常成功時には成果物を残さない。
- 主要操作の前には `frontend/e2e/helpers/navigation.ts` の hydration 待ちを通し、`html[data-hydrated="true"]` を確認してからクリックや入力を行う。`networkidle` や固定 sleep は使わない。
- テストが作成したデータは同じテスト内で削除するか、次回実行時のDBリセットに依存できるE2E専用DBだけで扱う。
- 開発サーバーとE2Eを同じポートで同時起動しない。必要な場合は `E2E_BACKEND_PORT` / `E2E_FRONTEND_PORT` を指定する。
- `frontend/e2e/helpers/` に、ログイン、未ログイン redirect 確認、ページ遷移、年月操作、明細フォーム操作、アップロード履歴確認、アップロード用PDF生成のような共通操作をまとめ、spec側で重複実装しない。

E2Eに残す観点と Integration Test へ寄せる観点は、次のように切り分ける。

- E2Eに残す: 未ログイン redirect、ログイン後の主要画面遷移、実 API 接続を伴う一覧表示、破壊的操作の確認、Cookie / CSRF / refresh を含む代表導線、Excelエクスポートのようなブラウザ統合。
- Frontend Integration Test へ寄せる: API mock 前提で再現できる表示分岐、再取得条件、フォームバリデーション、アップロード進捗表示、再試行UI、401/403 後の自己回復、細かなエラーメッセージ。
- Backend Integration Test へ寄せる: 画面を介さず確認できる認証/CSRF、永続化、集計、カテゴリ状態変更、ユーザー分離、PDF取込結果の整合性。

helper の責務も次のように分ける。

- `auth.ts`: サンプルユーザーのログイン状態作成、新規匿名コンテキスト作成。
- `navigation.ts`: URL確定、主要画面表示、未ログイン redirect の待ち合わせ。通常画面遷移と redirect 専用待ち合わせは helper を分け、見出し待ちだけで済まない画面へは汎用化しすぎない。
- `date.ts`: 年月操作や日付選択。
- `transactions.ts`: 明細作成・編集・削除の共通UI操作。
- `upload.ts`: PDF選択、ドロップ、履歴確認の共通操作。

直近の見直し順は次のとおり。

1. 保護対象ルートと redirect 系 spec を揃え、未ログイン時の server-side redirect を安定化する。
2. `gotoAppPage()` の待機条件を見直し、redirect 完了前や API 応答前の assert を減らす。
3. 画面固有の待機が必要な箇所は spec 側または専用 helper へ分け、全画面を一つの helper で吸収しようとしない。
4. E2Eで重くなっている表示分岐や再試行UIは、Frontend Integration Test へ移してから spec を薄くする。

## 更新方針

コード変更時は、変更が影響するテスト層を同じ作業内で更新する。

- ドメインルールや値オブジェクトを変更した場合は、該当する単体テストを更新する。
- ユースケース、リポジトリ、API契約を変更した場合は、該当する単体テストまたはBackend Integration Testを更新する。
- 画面内の表示分岐、API mock 前提のエラー表示、条件変更による再取得を変更した場合は、Frontend Integration Testを更新する。
- 画面の表示、操作、遷移、API接続、認証導線、エクスポート、主要なユーザーフローを変更した場合は、E2Eと該当するシナリオファイルを更新する。
- E2Eの対象外にする場合は、既存の単体テストまたはIntegration Testで同じリスクを検証できる理由をPRや作業メモに残す。

E2Eを追加・修正した場合は、少なくとも次を確認する。

```powershell
docker compose run --rm e2e
```

関連する通常チェックも必要に応じて実行する。

```powershell
docker compose run --rm --no-deps backend python -m pytest tests/unit
docker compose run --rm backend python -m pytest -m integration
docker compose run --rm --no-deps frontend npm run typecheck
docker compose run --rm --no-deps frontend npm run test:unit
docker compose run --rm --no-deps frontend npm run test:integration
docker compose run --rm --no-deps frontend npm run test:pages
docker compose run --rm --no-deps frontend npm run build
```
