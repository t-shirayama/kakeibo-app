# 開発・運用ワークフロー

## この文書の役割

この文書は、仕様更新、テスト更新、Docker Compose での確認、CI、依存更新のような開発・運用フローの正本をまとめる。

アーキテクチャ原則は `architecture-principles.md`、業務仕様は各SSOTを参照する。

## 仕様更新ルール

- 仕様、設計、技術選定、画面要件、データモデル、API、セキュリティ、運用方針を変更した場合は、関連するSSOT文書を同じ作業内で更新する。
- `.codex/config.toml` はSSOTではなくCodexのローカル実行設定として扱う。Codexの参照入口、プロジェクトルート判定、承認・サンドボックス方針を変更した場合だけ同期する。
- アーキテクチャ上の重要な決定を追加・変更した場合は `docs/specs/adrs/` にADRを追加または更新する。
- 画面の振る舞い、表示項目、操作、例外状態を変更した場合は `docs/requirements/` の該当画面要件を更新する。
- API仕様を変更した場合は `docs/specs/api-specs.md` を更新する。
- DB項目や永続化方針を変更した場合は `docs/specs/db-schema.md` を更新する。
- ドメイン概念、不変条件、業務ルールを変更した場合は `docs/specs/domain-model.md` を更新する。
- セキュリティ、認証、認可、Cookie、CSRF、パスワード、ファイルアップロードの方針を変更した場合は `docs/specs/security.md` を更新する。
- PDF取込、抽出、重複判定、保存方針を変更した場合は `docs/specs/pdf-import.md` を更新する。
- 用語を追加・変更した場合は `docs/specs/glossary.md` を更新する。
- E2Eの対象、観点、実行方法、テストデータを変更した場合は `docs/e2e/index.md` と該当する `docs/e2e/` 配下のシナリオを更新する。

## テスト更新ルール

- コードを変更した場合は、影響する単体テスト、Backend / Frontend Integration Test、E2Eを同じ作業内で更新する。
- テストを更新しない場合は、既存テストで同じリスクを検証できる理由を明確にする。
- フロントエンドのコードを変更した場合は、少なくとも `docker compose run --rm --no-deps frontend npm run lint`、`docker compose run --rm --no-deps frontend npm run typecheck`、`docker compose run --rm --no-deps frontend npm run build` を実行してから完了とする。
- ドメイン層の不変条件と計算ロジックは優先して単体テストを書く。
- ユースケースはリポジトリを差し替えて、主要な成功ケースと失敗ケースを検証する。
- インフラ層は変換処理、永続化、外部サービス連携の境界を中心にテストする。
- バックエンドテストは `backend/tests/unit/` を単体テスト、`backend/tests/integration/` を Integration Test の置き場とする。`unit/` には domain / application / infrastructure / presentation の単体寄りテストを置き、`integration/` には `integration` pytest marker を付けた FastAPI + Cookie認証 + CSRF + MySQL 永続化の結合テストを置く。
- フロントエンドテストは `frontend/src/test/unit/` を単体テスト、`frontend/src/test/integration/` を Integration Test の置き場とする。単体テストは純粋関数や小さな表示ロジックを検証し、Integration Test は Vitest、React Testing Library、MSW、user-event、jsdom を使い、API mock と TanStack Query を通した画面結合を検証する。ログイン、明細一覧、ダッシュボードのような主要画面の表示、APIエラー、URLや条件変更による再取得に加え、明細フォームの保存分岐、PDFアップロード履歴と再試行UI、CSRF 403 後の再試行は Integration Test で確認する。
- 画面表示、画面操作、認証導線、API接続、エクスポートなどの主要ユーザーフローはE2Eで検証する。
- Backend Integration Test では `backend/tests/integration/conftest.py` の fixture と認証済み API helper を使い、ログイン、CSRF ヘッダー付与、テストユーザー生成を spec ごとに重複させない。
- Excel 出力の基本妥当性は `backend/tests/integration/test_api_critical_paths.py` の export API IT で確認し、migration の適用可否は `docker compose run --rm backend python -m alembic upgrade head` を CI の独立 step として pull request ごとに確認する。
- Frontend Integration Test では `frontend/src/test/integration/helpers.tsx` の route-aware render / user helper と、`frontend/src/test/msw/http.ts` の API URL / エラーレスポンス helper を使い、`setMockUrl`、`userEvent.setup()`、MSW URL 定義の重複を減らす。
- Next.js App Router を使う E2E では hydration 完了前の操作で flaky failure が起きやすいため、Playwright helper で `html[data-hydrated="true"]` を待ってから操作する。`waitForLoadState("networkidle")` や固定 sleep は hydration 完了の代わりに使わない。

## テスト棚卸しと拡充順

2026-05 時点の主なテスト資産は次のとおり。

- Backend Unit Test: `backend/tests/unit/` に 9 ファイル。domain の不変条件、application の認証・取引・Excel出力、infrastructure repository、presentation API の単体寄り検証を置く。
- Backend Integration Test: `backend/tests/integration/` に 1 ファイル。FastAPI + Cookie認証 + CSRF + MySQL 永続化を通し、認証/refresh、明細 CRUD、月次集計、カテゴリ無効化時の未分類表示をまとめて守る。
- Frontend Unit Test: `frontend/src/test/unit/` に 2 ファイル。整形関数とカテゴリ表示ルールのような純粋ロジックを置く。
- Frontend Integration Test: `frontend/src/test/integration/` に 6 ファイル。ログイン、認証 refresh / CSRF 回復、明細一覧、レポート、アップロードを MSW と React Testing Library で検証する。
- E2E: `frontend/e2e/` に 11 spec。認証、主要画面遷移、ダッシュボード、カレンダー、明細一覧、収入設定、カテゴリ管理、アップロード、設定、レガシー導線、ドキュメント用スクリーンショットを扱う。

各層の責務と、優先して置く観点は次のとおり。

- Unit Test: 値オブジェクト、不変条件、表示用ヘルパー、日付・金額・カテゴリ整形のような純粋ロジックを最短で守る。DB、HTTP、ブラウザ、MSW には依存させない。
- Backend Integration Test: 認証Cookie、CSRF、FastAPI ルーティング、永続化、集計、ユーザー分離のように、バックエンド単体では分割しにくい境界を守る。画面表示や細かなUI分岐は持ち込まない。
- Frontend Integration Test: API mock 前提で、画面表示、フォーム送信、再取得、エラー表示、再試行、Query 状態遷移を守る。細かなブラウザ導線や実認証はE2Eへ寄せる。
- E2E: 実ブラウザ、実バックエンド、MySQL、Cookie を通した代表導線だけを守る。細かな異常系や表示分岐は Integration Test で先に検証し、E2E は「本番に近い結合で壊れやすいところ」に集中させる。

現時点での重複と未カバーは次の整理を基準に扱う。

- 明細一覧、ログイン、アップロードは Frontend Integration Test と E2E の両方に観点があるため、E2E では代表導線、Integration Test では分岐とエラー回復を主に受け持つ。
- Backend Integration Test は認証、明細CRUD、月次集計、カテゴリ状態変更、カテゴリ一覧のユーザー分離、PDF取込の成功/失敗履歴、Excel出力までを持つ。integration 用DBは `INTEGRATION_DATABASE_URL` で本番系 `DATABASE_URL` から分離し、migration smoke はアプリ用DBに対して独立 step で確認する。
- Frontend Integration Test は、主要画面の読み込みに加えて、明細フォームの追加・編集、PDFアップロードの進捗と再試行、401/403 時の認証 refresh と CSRF 再取得まで確認できる状態にした。カテゴリ管理、設定保存のような操作系はまだ薄い。
- E2E helper は `auth.ts`、`date.ts`、`navigation.ts`、`transactions.ts`、`upload.ts` に分かれ、`navigation.ts` では通常画面遷移の `gotoAppPage()` と redirect 専用待ち合わせを分ける。

今後の拡充順は、次の順番を標準とする。

1. Unit Test の未カバー純粋ロジックを追加し、重複 fixture と小さな helper を整理する。
2. Backend / Frontend Integration Test の共通 fixture と helper を整え、認証、CSRF、MSW、Query 初期化の準備処理を標準化する。
3. 認証ガード対象ルートと E2E の待ち合わせを見直し、認証境界の揺れと redirect 起因の flaky failure を減らす。
4. E2E helper を代表導線中心に整理し、細かな表示分岐や再試行UIは Frontend Integration Test へ寄せる。
5. そのうえで、カテゴリ管理、PDF取込、明細フォーム、CSRF再試行、Excel出力、migration 検証の順に、各層へ追加する。

タスク化の判断基準は次のとおり。

- 同じ前準備を 2 回以上書き始めたら、まず fixture または helper 化を検討する。
- 失敗時の原因が UI ではなく API 契約や永続化にあるなら Backend Integration Test へ寄せる。
- 失敗時の原因が画面状態、Query、再描画、エラー表示にあるなら Frontend Integration Test へ寄せる。
- 未ログイン redirect、Cookie、実 API 接続、主要遷移の確認が必要なら E2E に残す。

## Docker Compose での確認ルール

- 動作確認やテストはDocker Composeのコンテナ内で実行することを標準とし、ホスト環境のPython/Nodeの有無に依存しない。
- `frontend/Dockerfile.dev` は通常開発用、`frontend/Dockerfile.e2e` は Playwright とE2E用バックエンド実行環境を含む検証用、`frontend/Dockerfile.prod` は本番ビルド確認用として分ける。
- バックエンドテスト全体は `docker compose run --rm backend python -m pytest` を基本コマンドとする。
- バックエンドの単体テストだけを確認する場合は `docker compose run --rm --no-deps backend python -m pytest tests/unit` を使う。単体テストはMySQL起動に依存させない。
- バックエンドの Integration Test だけを確認する場合は `docker compose run --rm backend python -m pytest -m integration` を使う。Docker Compose では `INTEGRATION_DATABASE_URL` と `INTEGRATION_ADMIN_DATABASE_URL` を backend service に渡し、テスト起動時に integration 専用DBを自動作成する。CI の `test` workflow では Alembic 適用確認後にバックエンド単体テスト、バックエンドIntegration Test、フロントエンド単体テスト、フロントエンドIntegration Test、E2Eを別ステップで実行する。
- フロントエンドの lint / 型チェック / ビルドは `docker compose run --rm --no-deps frontend npm run lint`、`docker compose run --rm --no-deps frontend npm run typecheck`、`docker compose run --rm --no-deps frontend npm run build` を基本コマンドとする。Next.js 16 以降は `next lint` が廃止されているため、lint は ESLint CLI で実行する。型チェックは `next typegen` で route types を生成してから `tsc --noEmit` を実行する。
- フロントエンドの単体テストだけを確認する場合は `docker compose run --rm --no-deps frontend npm run test:unit`、Integration Test だけを確認する場合は `docker compose run --rm --no-deps frontend npm run test:integration` を使う。どちらもバックエンドやMySQL起動に依存させない。依存追加直後など、`frontend-node-modules` ボリュームが古い場合は `docker compose run --rm --no-deps frontend npm install` で lockfile を反映してから実行する。
- E2Eは `docker compose run --rm e2e` を基本コマンドとし、frontend 側は `npm run build && next start` で production build を起動する。
- Alembic適用確認は `docker compose run --rm backend python -m alembic upgrade head` を使う。
- `frontend/Dockerfile.e2e`、`frontend/package.json`、`frontend/package-lock.json`、`docker-compose.yml` を変更した場合は、CIへ出す前に `docker compose build e2e` でE2E実行環境の build を確認する。
- GitHub Actions の実行ログを直接調べる場合は、`GITHUB_TOKEN` または `GH_TOKEN` を設定し、`scripts/show-github-actions-run.ps1 -LatestFailure` で直近失敗 run と失敗 job を確認する。`-RunId <id>` を指定すると特定 run の job 一覧を確認できる。

## CI と自動化

- GitHub ActionsのCIは `quality` と `test` に分ける。
- `quality` では `frontend` の `lint` / `typecheck` / `build`、バックエンドのレイヤ依存チェック、未確定事項チェック、シークレットスキャン、OpenAPI生成物チェックを実行する。
- `quality` ではあわせて `backend/requirements.lock` の再生成差分も検証する。
- `test` では Alembic 適用確認、バックエンド単体テスト、バックエンドIntegration Test、フロントエンド単体テスト、フロントエンドIntegration Test、E2Eを pull request ごとに分けて実行する。現時点では定期実行は追加せず、PR単位の即時検知を優先する。
- APIクライアント生成物の差分は `docker compose run --rm backend python scripts/generate_openapi_client.py --check` で検証する。
- バックエンド依存のlockファイルは `docker compose run --rm backend python scripts/generate_requirements_lock.py` で更新し、`--check` で差分確認する。
- clone 後は `scripts/install-git-hooks.ps1` または `scripts/install-git-hooks.sh` で `core.hooksPath=.githooks` を設定し、`push` 前に `requirements.lock` 整合性チェックと、E2E関連変更時の `docker compose build e2e` を自動実行する。
- 依存更新は Dependabot で管理し、少なくとも `frontend` の npm、`backend` の Python、GitHub Actions、Dockerfile の更新PRを週次で自動作成する。

## ドキュメント品質チェック

- ドキュメント更新後は `rg "確認事項|未決定事項|TODO|TBD|要確認" docs .codex -g "*.md" -g "*.toml"` を実行し、意図しない未確定事項が残っていないか確認する。
