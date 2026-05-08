# 変更ルール

## 仕様更新ルール

- 仕様、設計、技術選定、画面要件、データモデル、API、セキュリティ、運用方針を変更した場合は、関連するSSOT文書を同じ作業内で更新する。
- `.codex/config.toml` はSSOTではなくCodexのローカル実行設定として扱う。Codexの参照入口、プロジェクトルート判定、承認・サンドボックス方針を変更した場合だけ同期する。
- アーキテクチャ上の重要な決定を追加・変更した場合は `docs/specs/adrs/` にADRを追加または更新する。
- 画面の振る舞い、表示項目、操作、例外状態を変更した場合は `docs/requirements/` の該当画面要件を更新する。
- API仕様を変更した場合は `docs/specs/api-specs/README.md` を更新する。
- DB項目や永続化方針を変更した場合は `docs/specs/db-schema/README.md` を更新する。
- ドメイン概念、不変条件、業務ルールを変更した場合は `docs/specs/domain-model/README.md` を更新する。
- セキュリティ、認証、認可、Cookie、CSRF、パスワード、ファイルアップロードの方針を変更した場合は `docs/specs/security/README.md` を更新する。
- PDF取込、抽出、重複判定、保存方針を変更した場合は `docs/specs/pdf-import/README.md` を更新する。
- 用語を追加・変更した場合は `docs/specs/glossary/README.md` を更新する。
- E2Eの対象、観点、実行方法、テストデータを変更した場合は `docs/tests/e2e/README.md` と該当する `docs/tests/e2e/` 配下のシナリオを更新する。
- 現行画面のスクリーンショットを更新した場合は、既存の現行画像を `docs/designs/archive/screen-updates/<YYYY-MM-DD>/` へ退避し、`docs/designs/README.md` と README の画面イメージも同じ作業内で更新する。

## リファクタリング方針

- リファクタリングでは、変更対象だけでなく同じ構造・責務分離・共通化方針を適用できる類似箇所を確認する。
- 同じテーマ内で安全に横展開でき、API契約・DB・画面仕様を変えない範囲は同じ作業でそろえる。
- 横展開が別テーマ、別PR単位、または検証範囲が大きくなる場合は無理に混ぜず、後続タスクとして扱う。
