# CIと品質チェック

## CI と自動化

- GitHub Actions のCIは `.github/workflows/ci.yml` に集約する。workflow 間では `needs` を張れないため、品質チェックとテストを1つの workflow 内の job として分割する。
- CI は `main` / `develop` への push と、`main` / `develop` 宛ての pull request で実行する。`main` / `develop` への push と feature 系以外の pull request は全 job を実行する。
- pull request の head branch が `feature/**` または `features/**` の場合だけ、変更パスに応じて backend / frontend / E2E 関連 job を絞る。`docs/`、`README.md`、`.codex/`、`.github/` だけの共通変更では repo-check、backend-check、frontend-check までを実行し、unit / integration / E2E は省略する。
- CI の段階は、step1 を `backend-check` / `frontend-check`、step2 を `backend-unit` / `frontend-unit`、step3 を `backend-integration` / `frontend-integration`、最後を `e2e` とする。E2E は backend または frontend の変更、E2E関連ファイルの変更、または全実行条件のときに実行する。
- `backend-check` ではバックエンドのレイヤ依存チェック、Alembic適用確認、OpenAPI生成物チェック、`backend/requirements.lock` の再生成差分チェックを実行する。Pythonアプリには独立した build script がないため、Docker Compose 上での migration smoke と生成物/lock 検証をバックエンド側のビルド相当チェックとして扱う。
- `frontend-check` では `frontend` の `lint` / `typecheck` / `build` を実行する。Next.js の production build は静的チェック段階に含め、単体テストやIntegration Testより前にビルド不能な状態を検知する。
- `repo-check` では未確定事項チェックとシークレットスキャンを実行する。段階制御上は preflight 扱いとし、テストの step1 には含めない。
- APIクライアント生成物の差分は `docker compose run --rm backend python scripts/generate_openapi_client.py --check` で検証する。
- バックエンド依存のlockファイルは `docker compose run --rm backend python scripts/generate_requirements_lock.py` で更新し、`--check` で差分確認する。
- clone 後は `scripts/install-git-hooks.ps1` または `scripts/install-git-hooks.sh` で `core.hooksPath=.githooks` を設定する。`push` 前には、CI の `backend-check` と同じく `backend/`、`docker-compose.yml`、`docs/`、`README.md`、`.codex/`、`.github/` の変更で `requirements.lock` 整合性チェックを実行し、E2E関連変更時は `docker compose build e2e` を自動実行する。
- 依存更新は Dependabot で管理し、少なくとも `frontend` の npm、`backend` の Python、GitHub Actions、Dockerfile の更新PRを週次で自動作成する。

## ドキュメント品質チェック

- ドキュメント更新後は `rg "確認事項|未決定事項|TODO|TBD|要確認" docs .codex AGENTS.md README.md -g "*.md" -g "*.toml"` を実行し、意図しない未確定事項が残っていないか確認する。
