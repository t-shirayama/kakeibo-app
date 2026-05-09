# ドキュメント

このディレクトリはプロジェクトドキュメントの入口です。

実装や仕様確認で迷った場合は、まずこのファイルで参照先を確認し、次に `docs/specs/README.md` と `docs/specs/project-rules/README.md` を読んでください。

## 参照順

1. 共通ルールの入口を確認する: [仕様書入口](specs/README.md)
2. プロジェクトルールを確認する: [プロジェクトルール](specs/project-rules/README.md)
3. 開発・運用ルールを確認する: [開発・運用ワークフロー](specs/development-workflow/README.md)
4. アーキテクチャ方針を確認する: [アーキテクチャ](architecture/README.md)
5. 画面別の要件を確認する: [画面別要件](#画面別要件)
6. テスト方針やシナリオを確認する: [テストドキュメント](tests/README.md)
7. 画面イメージを確認する: [画面イメージ一覧](designs/README.md)
8. 実装タスクを確認する: [タスク管理](tasks/)

画面共通の表示前提は `docs/requirements/screens/common.md` を参照してください。

## 構成

```text
docs/
├── README.md
├── architecture/
│   ├── README.md
│   ├── overview/
│   ├── backend/
│   ├── frontend/
│   └── adrs/
├── designs/
├── requirements/
│   ├── README.md
│   └── screens/
├── specs/
│   ├── README.md
│   ├── project-rules/
│   ├── development-workflow/
│   ├── domain-model/
│   ├── api-specs/
│   ├── db-schema/
│   ├── glossary/
│   ├── pdf-import/
│   └── security/
├── tasks/
└── tests/
    ├── README.md
    ├── unit/
    ├── integration/
    └── e2e/
```

## 仕様書SSOT

仕様書の正本は `docs/specs/` 配下に置きます。詳細は [仕様書入口](specs/README.md) を参照してください。

## 画面別要件

画面要件は `docs/requirements/screens/` 配下に置きます。

- [画面要件一覧](requirements/screens/README.md)
- [画面共通要件](requirements/screens/common.md)
- [ダッシュボード](requirements/screens/dashboard.md)
- [カレンダー](requirements/screens/calendar.md)
- [明細一覧](requirements/screens/transactions.md)
- [収入設定](requirements/screens/income-settings.md)
- [予算管理](requirements/screens/budgets.md)
- [明細詳細（編集モーダル）](requirements/screens/transaction-edit-modal.md)
- [カテゴリ管理](requirements/screens/categories.md)
- [分類ルール](requirements/screens/category-rules.md)
- [アップロード](requirements/screens/upload.md)
- [レガシーレポート導線](requirements/screens/reports.md)
- [監査ログ](requirements/screens/audit-logs.md)
- [設定](requirements/screens/settings.md)

## テスト

テスト方針の正本は [開発・運用ワークフロー](specs/development-workflow/README.md) です。単体テスト、Integration Test、E2Eの住み分け、フォルダ構成、Docker Composeでの実行コマンド、CIの実行単位は同文書を参照してください。

テスト文書の入口は [テストドキュメント](tests/README.md) です。E2Eの実行方法と更新方針は [E2Eテスト](tests/e2e/README.md) を参照してください。

## タスク

未完了タスクは [未完了タスク](tasks/open.md)、完了済みタスクは [完了済みタスク](tasks/completed.md) で管理します。
完了済みタスクの詳細履歴は `docs/tasks/completed/` 配下に月別でアーカイブします。

## 運用

- 仕様や実装方針を変更した場合は、関連するSSOT文書を同じ作業内で更新します。
- 開発フロー、CI、Docker Compose での確認手順、Dependabot運用を変える場合は、`docs/specs/development-workflow/README.md` を更新します。
- 技術スタック、レイヤ構成、依存方向、システム境界を変える場合は、`docs/architecture/README.md` 配下の該当文書を更新します。
- 画面の振る舞いや表示項目を変更した場合は、`docs/requirements/screens/` の該当画面要件を更新します。
- テスト方針やE2Eの対象を変更した場合は、`docs/tests/` 配下の該当文書を更新します。
- 依存更新PRは Dependabot で週次作成し、対象は `frontend` の npm、`backend` の Python、GitHub Actions、Dockerfile を基本とします。
- Codex向けの最小ルールはリポジトリ直下の `AGENTS.md` に置きます。
