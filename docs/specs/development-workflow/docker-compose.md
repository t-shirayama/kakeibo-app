# Docker Composeでの確認ルール

- 動作確認やテストはDocker Composeのコンテナ内で実行することを標準とし、ホスト環境のPython/Nodeの有無に依存しない。
- `frontend/Dockerfile.dev` は通常開発用、`frontend/Dockerfile.e2e` は Playwright とE2E用バックエンド実行環境を含む検証用、`frontend/Dockerfile.prod` は本番ビルド確認用として分ける。
- バックエンドテスト全体は `docker compose run --rm backend python -m pytest` を基本コマンドとする。
- バックエンドの単体テストだけを確認する場合は `docker compose run --rm --no-deps backend python -m pytest tests/unit` を使う。単体テストはMySQL起動に依存させない。
- バックエンドの Integration Test だけを確認する場合は `docker compose run --rm backend python -m pytest -m integration` を使う。Docker Compose では `INTEGRATION_DATABASE_URL` と `INTEGRATION_ADMIN_DATABASE_URL` を backend service に渡し、テスト起動時に integration 専用DBを自動作成する。CI では backend-check、backend-unit、backend-integration を別 job として段階実行する。
- フロントエンドの lint / 型チェック / ビルドは `docker compose run --rm --no-deps frontend npm run lint`、`docker compose run --rm --no-deps frontend npm run typecheck`、`docker compose run --rm --no-deps frontend npm run build` を基本コマンドとする。Next.js 16 以降は `next lint` が廃止されているため、lint は ESLint CLI で実行する。型チェックは `next typegen` で route types を生成してから `tsc --noEmit` を実行する。
- フロントエンドの単体テストだけを確認する場合は `docker compose run --rm --no-deps frontend npm run test:unit`、Integration Test だけを確認する場合は `docker compose run --rm --no-deps frontend npm run test:integration` を使う。どちらもバックエンドやMySQL起動に依存させない。依存追加直後など、`frontend-node-modules` ボリュームが古い場合は `docker compose run --rm --no-deps frontend npm install` で lockfile を反映してから実行する。
- E2Eは `docker compose run --rm e2e` を基本コマンドとし、frontend 側は `npm run build && next start` で production build を起動する。
- Alembic適用確認は `docker compose run --rm backend python -m alembic upgrade head` を使う。
- `frontend/Dockerfile.e2e`、`frontend/package.json`、`frontend/package-lock.json`、`docker-compose.yml` を変更した場合は、CIへ出す前に `docker compose build e2e` でE2E実行環境の build を確認する。
- GitHub Actions の実行ログを直接調べる場合は、`GITHUB_TOKEN` または `GH_TOKEN` を設定し、`scripts/show-github-actions-run.ps1 -LatestFailure` で直近失敗 run と失敗 job を確認する。`-RunId <id>` を指定すると特定 run の job 一覧を確認できる。
