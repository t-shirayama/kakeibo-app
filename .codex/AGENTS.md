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
