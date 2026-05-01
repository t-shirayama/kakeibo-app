# ドキュメント

このディレクトリはプロジェクトドキュメントの入口です。

実装や仕様確認で迷った場合は、まずこのファイルで参照先を確認し、次に `docs/specs/project-rules.md` を読んでください。

## 参照順

1. プロジェクト全体のルールを確認する: [プロジェクトルール](specs/project-rules.md)
2. 画面別の要件を確認する: [画面要件入口](requirements.md)
3. E2Eテストの実行方法やシナリオを確認する: [E2Eテスト](e2e.md)
4. 個別仕様を確認する: `docs/specs/` 配下の該当文書
5. 画面デザイン画像を確認する: `docs/designs/`

## 構成

```text
docs/
├── README.md
├── designs/
├── e2e.md
├── requirements.md
├── requirements/
└── specs/
    ├── domain-model.md
    ├── api-specs.md
    ├── db-schema.md
    ├── glossary.md
    ├── project-rules.md
    ├── backend-architecture.md
    ├── frontend-architecture.md
    ├── pdf-import.md
    ├── security.md
    └── adrs/
```

## 仕様書SSOT

仕様書の正本は `docs/specs/` 配下に置きます。

- [プロジェクトルール](specs/project-rules.md)
- [ドメインモデル定義](specs/domain-model.md)
- [API仕様](specs/api-specs.md)
- [DBスキーマ](specs/db-schema.md)
- [用語集](specs/glossary.md)
- [バックエンド設計](specs/backend-architecture.md)
- [フロントエンド設計](specs/frontend-architecture.md)
- [PDF取込仕様](specs/pdf-import.md)
- [セキュリティ仕様](specs/security.md)
- [ADR](specs/adrs/)

## テスト

テスト方針の正本は [プロジェクトルール](specs/project-rules.md) です。

E2Eの実行方法、シナリオ、更新方針は [E2Eテスト](e2e.md) を参照してください。

## 運用

- 仕様や実装方針を変更した場合は、関連するSSOT文書を同じ作業内で更新します。
- 画面の振る舞いや表示項目を変更した場合は、`docs/requirements/` の該当画面要件を更新します。
- E2Eの対象や観点を変更した場合は、`docs/e2e.md` を更新します。
- Codex向けの最小ルールは `.codex/AGENTS.md` に置きます。
