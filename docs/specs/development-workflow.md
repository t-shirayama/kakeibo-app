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
- ドメイン層の不変条件と計算ロジックは優先して単体テストを書く。
- ユースケースはリポジトリを差し替えて、主要な成功ケースと失敗ケースを検証する。
- インフラ層は変換処理、永続化、外部サービス連携の境界を中心にテストする。
- バックエンドテストは `backend/tests/unit/` を単体テスト、`backend/tests/integration/` を Integration Test の置き場とする。`unit/` には domain / application / infrastructure / presentation の単体寄りテストを置き、`integration/` には `integration` pytest marker を付けた FastAPI + Cookie認証 + CSRF + MySQL 永続化の結合テストを置く。
- フロントエンドテストは `frontend/src/test/unit/` を単体テスト、`frontend/src/test/integration/` を Integration Test の置き場とする。単体テストは純粋関数や小さな表示ロジックを検証し、Integration Test は Vitest、React Testing Library、MSW、user-event、jsdom を使い、API mock と TanStack Query を通した画面結合を検証する。ログイン、明細一覧、ダッシュボードのような主要画面の表示、APIエラー、URLや条件変更による再取得は Integration Test で確認する。
- 画面表示、画面操作、認証導線、API接続、エクスポートなどの主要ユーザーフローはE2Eで検証する。

## Docker Compose での確認ルール

- 動作確認やテストはDocker Composeのコンテナ内で実行することを標準とし、ホスト環境のPython/Nodeの有無に依存しない。
- `frontend/Dockerfile.dev` は通常開発用、`frontend/Dockerfile.e2e` は Playwright とE2E用バックエンド実行環境を含む検証用、`frontend/Dockerfile.prod` は本番ビルド確認用として分ける。
- バックエンドテスト全体は `docker compose run --rm backend python -m pytest` を基本コマンドとする。
- バックエンドの単体テストだけを確認する場合は `docker compose run --rm --no-deps backend python -m pytest tests/unit` を使う。単体テストはMySQL起動に依存させない。
- バックエンドの Integration Test だけを確認する場合は `docker compose run --rm backend python -m pytest -m integration` を使う。CI の `test` workflow では Alembic 適用確認後にバックエンド単体テスト、バックエンドIntegration Test、フロントエンド単体テスト、フロントエンドIntegration Test、E2Eを別ステップで実行する。
- フロントエンドの lint / 型チェック / ビルドは `docker compose run --rm --no-deps frontend npm run lint`、`docker compose run --rm --no-deps frontend npm run typecheck`、`docker compose run --rm --no-deps frontend npm run build` を基本コマンドとする。Next.js 16 以降は `next lint` が廃止されているため、lint は ESLint CLI で実行する。型チェックは `next typegen` で route types を生成してから `tsc --noEmit` を実行する。
- フロントエンドの単体テストだけを確認する場合は `docker compose run --rm --no-deps frontend npm run test:unit`、Integration Test だけを確認する場合は `docker compose run --rm --no-deps frontend npm run test:integration` を使う。どちらもバックエンドやMySQL起動に依存させない。依存追加直後など、`frontend-node-modules` ボリュームが古い場合は `docker compose run --rm --no-deps frontend npm install` で lockfile を反映してから実行する。
- E2Eは `docker compose run --rm e2e` を基本コマンドとする。
- Alembic適用確認は `docker compose run --rm backend python -m alembic upgrade head` を使う。
- `frontend/Dockerfile.e2e`、`frontend/package.json`、`frontend/package-lock.json`、`docker-compose.yml` を変更した場合は、CIへ出す前に `docker compose build e2e` でE2E実行環境の build を確認する。

## CI と自動化

- GitHub ActionsのCIは `quality` と `test` に分ける。
- `quality` では `frontend` の `lint` / `typecheck` / `build`、バックエンドのレイヤ依存チェック、未確定事項チェック、シークレットスキャン、OpenAPI生成物チェックを実行する。
- `quality` ではあわせて `backend/requirements.lock` の再生成差分も検証する。
- `test` では Alembic 適用確認、バックエンド単体テスト、バックエンドIntegration Test、フロントエンド単体テスト、フロントエンドIntegration Test、E2Eを分けて実行する。
- APIクライアント生成物の差分は `docker compose run --rm backend python scripts/generate_openapi_client.py --check` で検証する。
- バックエンド依存のlockファイルは `docker compose run --rm backend python scripts/generate_requirements_lock.py` で更新し、`--check` で差分確認する。
- clone 後は `scripts/install-git-hooks.ps1` または `scripts/install-git-hooks.sh` で `core.hooksPath=.githooks` を設定し、`push` 前に `requirements.lock` 整合性チェックと、E2E関連変更時の `docker compose build e2e` を自動実行する。
- 依存更新は Dependabot で管理し、少なくとも `frontend` の npm、`backend` の Python、GitHub Actions、Dockerfile の更新PRを週次で自動作成する。

## ドキュメント品質チェック

- ドキュメント更新後は `rg "確認事項|未決定事項|TODO|TBD|要確認" docs .codex -g "*.md" -g "*.toml"` を実行し、意図しない未確定事項が残っていないか確認する。
