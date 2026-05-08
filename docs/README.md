# ドキュメント

このディレクトリはプロジェクトドキュメントの入口です。

実装や仕様確認で迷った場合は、まずこのファイルで参照先を確認し、次に `docs/specs/project-rules.md` を読んでください。

## 参照順

1. 共通ルールの入口を確認する: [プロジェクトルール](specs/project-rules.md)
2. 開発・運用ルールを確認する: [開発・運用ワークフロー](specs/development-workflow.md)
3. 横断アーキテクチャ原則を確認する: [アーキテクチャ原則](specs/architecture-principles.md)
4. 画面別の要件を確認する: [画面要件入口](requirements.md)
画面共通の表示前提は `docs/requirements/common.md`
5. E2Eテストの実行方法やシナリオを確認する: [E2Eテスト](e2e/index.md)
6. 個別仕様を確認する: `docs/specs/` 配下の該当文書
7. 画面イメージを確認する: [画面イメージ一覧](designs/README.md)
8. 実装タスクを確認する: [タスク管理](tasks/)

## 構成

```text
docs/
├── README.md
├── designs/
│   ├── README.md
│   └── archive/
├── e2e.md
├── e2e/
├── requirements.md
├── requirements/
├── tasks/
└── specs/
    ├── domain-model.md
    ├── domain/
    ├── api-specs.md
    ├── api/
    ├── architecture-principles.md
    ├── db-schema.md
    ├── db/
    ├── development-workflow.md
    ├── development/
    ├── glossary.md
    ├── project-rules.md
    ├── backend-architecture.md
    ├── backend/
    ├── frontend-architecture.md
    ├── pdf-import.md
    ├── security.md
    └── adrs/
```

## 仕様書SSOT

仕様書の正本は `docs/specs/` 配下に置きます。

- [プロジェクトルール](specs/project-rules.md)
- [開発・運用ワークフロー](specs/development-workflow.md)
- [アーキテクチャ原則](specs/architecture-principles.md)
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

テスト方針の正本は [開発・運用ワークフロー](specs/development-workflow.md) です。単体テスト、Integration Test、E2Eの住み分け、フォルダ構成、Docker Composeでの実行コマンド、CIの実行単位は同文書を参照してください。

E2Eの実行方法と更新方針は [E2Eテスト](e2e/index.md) を参照してください。E2Eでは実ブラウザ、実バックエンド、MySQLを含む代表導線を扱い、細かい分岐は単体テストやIntegration Testへ寄せます。シナリオ詳細は `docs/e2e/` 配下に分割しています。

## タスク

未完了タスクは [未完了タスク](tasks/open.md)、完了済みタスクは [完了済みタスク](tasks/completed.md) で管理します。
完了済みタスクの詳細履歴は `docs/tasks/completed/` 配下に月別でアーカイブします。

## 運用

- 仕様や実装方針を変更した場合は、関連するSSOT文書を同じ作業内で更新します。
- 開発フロー、CI、Docker Compose での確認手順、Dependabot運用を変える場合は、`docs/specs/development-workflow.md` を更新します。
- 技術スタック、レイヤ構成、依存方向、システム境界を変える場合は、`docs/specs/architecture-principles.md` を更新します。
- 画面の振る舞いや表示項目を変更した場合は、`docs/requirements/` の該当画面要件を更新します。
- E2Eの対象や観点を変更した場合は、`docs/e2e/index.md` と該当する `docs/e2e/` 配下のシナリオを更新します。
- 依存更新PRは Dependabot で週次作成し、対象は `frontend` の npm、`backend` の Python、GitHub Actions、Dockerfile を基本とします。
- Codex向けの最小ルールは `.codex/AGENTS.md` に置きます。
