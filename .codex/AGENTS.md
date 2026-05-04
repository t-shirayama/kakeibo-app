# AGENTS.md

## 基本方針

- 日本語で簡潔かつ丁寧に回答してください。
- 実装や仕様確認で迷った場合は、まず `docs/README.md` を読み、次に `docs/specs/project-rules.md` を確認してください。
- `.codex/config.toml` は Codex の設定ファイルであり、プロジェクト仕様の正本ではありません。

## 参照順

1. ドキュメント入口: `docs/README.md`
2. プロジェクトルール: `docs/specs/project-rules.md`
3. 画面要件: `docs/requirements.md` および `docs/requirements/`
4. E2Eテスト方針: `docs/e2e/index.md`
5. 個別仕様: `docs/specs/` 配下の該当文書

## 変更パターン別の参照順

- APIを変更する場合
  1. 仕様: `docs/specs/api-specs.md`、必要に応じて `docs/specs/domain-model.md` と `docs/specs/security.md`
  2. 実装: `backend/app/presentation/api/routes/` → `backend/app/application/` → `backend/app/infrastructure/repositories/`
  3. テスト: `backend/tests/` のAPI/ユースケース系テスト、必要に応じて `frontend/e2e/`
  4. 生成物: `frontend/src/lib/generated/openapi-client.ts`。API契約を変えたら `backend/scripts/generate_openapi_client.py` で再生成する

- DBを変更する場合
  1. 仕様: `docs/specs/db-schema.md`、必要に応じて `docs/specs/domain-model.md`
  2. 実装: `backend/app/infrastructure/models/`、`backend/app/infrastructure/repositories/`、`backend/alembic/versions/`
  3. テスト: `docker compose run --rm backend python -m pytest`
  4. 生成物: Alembicマイグレーション。スキーマ変更時は差分を同じ作業で追加する

- UIや画面要件を変更する場合
  1. 仕様: `docs/requirements.md`、該当する `docs/requirements/*.md`、必要に応じて `docs/designs/`
  2. 実装: `frontend/app/` のルーティング入口 → `frontend/src/features/` → `frontend/src/components/` / `frontend/src/lib/`
  3. テスト: `docker compose run --rm --no-deps frontend npm run typecheck`、`docker compose run --rm --no-deps frontend npm run build`、必要に応じて `frontend/e2e/`
  4. 生成物: APIの入出力型が変わる場合だけ `frontend/src/lib/generated/openapi-client.ts` を更新する

- E2Eを追加・変更する場合
  1. 仕様: `docs/e2e/index.md`、該当する `docs/e2e/*.md`
  2. 実装: `frontend/e2e/*.spec.ts`、必要に応じて `frontend/e2e/auth.setup.ts`、`frontend/scripts/reset-e2e-db.mjs`
  3. テスト: `docker compose run --rm e2e`
  4. 生成物: なし。シナリオ文書とテストコードを同じ作業でそろえる

- PDF取込を変更する場合
  1. 仕様: `docs/specs/pdf-import.md`、必要に応じて `docs/specs/api-specs.md` と `docs/specs/security.md`
  2. 実装: `backend/app/application/importing/` → `backend/app/infrastructure/parsers/` → `backend/app/infrastructure/repositories/uploads.py` / `backend/app/infrastructure/storage.py`
  3. テスト: PDF抽出fixtureを使うバックエンドテスト、必要に応じて `frontend/e2e/upload.spec.ts`
  4. 生成物: 抽出fixtureや期待値JSONを更新し、取込結果との差分がない状態にする

- 認証・セキュリティを変更する場合
  1. 仕様: `docs/specs/security.md`、必要に応じて `docs/specs/api-specs.md` と `docs/specs/project-rules.md`
  2. 実装: `backend/app/application/auth/`、`backend/app/presentation/api/routes/auth.py`、`frontend/src/lib/auth.ts`、`frontend/src/lib/csrf.ts`
  3. テスト: 認証/CSRFのバックエンドテスト、必要に応じて `frontend/e2e/auth.spec.ts`
  4. 生成物: 認証APIのDTOを変えた場合だけ `frontend/src/lib/generated/openapi-client.ts` を再生成する

## 作業ルール

- タスクが大きい場合は、まず作業を小さな単位に分割し、依存関係と並列実行できる範囲を整理してください。
- 分割した作業のうち、互いに独立して進められる調査・実装・検証がある場合は、必要に応じてサブエージェントを使って並列に実行してください。
- コード、単体テスト、E2Eテストへコメントを追加する場合は、原則として日本語で、処理の意図や業務上の理由が分かるように簡潔に記載してください。
- 仕様、設計、画面要件、API、DB、セキュリティ、E2E、運用方針を変更した場合は、関連するドキュメントを同じ作業内で更新してください。
- コードを修正した場合は、影響する単体テスト、APIテスト、E2Eを同じ作業内で更新してください。更新しない場合は、既存テストで同じリスクを検証できる理由を最終回答で説明してください。
- 無効化カテゴリを未分類表示に寄せるなど、表示にも影響する業務ルールは画面ごとに重複実装せず、バックエンドまたは `src/lib` / アプリケーション層の共有ヘルパーへ集約してください。
- 動作確認やテストは、原則としてホスト環境のPython/NodeではなくDocker Composeのコンテナ内で実行してください。
- フロントエンドの型チェックやビルドは `docker compose run --rm --no-deps frontend npm run typecheck` や `docker compose run --rm --no-deps frontend npm run build` を優先してください。
- バックエンドテストは `docker compose run --rm backend python -m pytest`、E2Eは `docker compose run --rm e2e` を優先してください。
- ドキュメント更新後は、次のコマンドで意図しない未確定事項が残っていないか確認してください。

```powershell
rg "確認事項|未決定事項|TODO|TBD|要確認" docs .codex -g "*.md" -g "*.toml"
```

## タスク分割ルール

- アーキテクチャ変更、機能移動、依存方向修正は、原則として1PRにつき1テーマに限定してください。
- frontend の features 移行は、原則として1PRにつき1 feature までにしてください。
- backend の application 分割は、原則として1PRにつき1機能または1 use case 群までにしてください。
- 生成物更新と手書き実装変更は同じPRに含めてよいですが、無関係なUI改善や別テーマの整理は混ぜないでください。

## 主要ドキュメント

- 仕様書SSOT: `docs/specs/`
- ドメインモデル: `docs/specs/domain-model.md`
- API仕様: `docs/specs/api-specs.md`
- DBスキーマ: `docs/specs/db-schema.md`
- 用語集: `docs/specs/glossary.md`
- バックエンド設計: `docs/specs/backend-architecture.md`
- フロントエンド設計: `docs/specs/frontend-architecture.md`
- PDF取込仕様: `docs/specs/pdf-import.md`
- セキュリティ仕様: `docs/specs/security.md`
- ADR: `docs/specs/adrs/`
