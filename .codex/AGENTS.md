# AGENTS.md

## 基本方針

- 日本語で簡潔かつ丁寧に回答してください。
- 実装や仕様確認で迷った場合は、まず `docs/README.md` を読み、次に `docs/specs/project-rules.md` を確認してください。
- `.codex/config.toml` は Codex の設定ファイルであり、プロジェクト仕様の正本ではありません。

## 参照順

1. ドキュメント入口: `docs/README.md`
2. プロジェクトルール: `docs/specs/project-rules.md`
3. 画面要件: `docs/requirements.md` および `docs/requirements/`
4. E2Eテスト方針: `docs/e2e.md`
5. 個別仕様: `docs/specs/` 配下の該当文書

## 作業ルール

- 仕様、設計、画面要件、API、DB、セキュリティ、E2E、運用方針を変更した場合は、関連するドキュメントを同じ作業内で更新してください。
- コードを修正した場合は、影響する単体テスト、APIテスト、E2Eを同じ作業内で更新してください。更新しない場合は、既存テストで同じリスクを検証できる理由を最終回答で説明してください。
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
