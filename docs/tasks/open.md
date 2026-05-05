# 未完了タスク

このファイルは未完了の実装タスクだけを管理します。

完了済みタスクは [完了済みタスク](completed.md) に退避しています。

仕様の正本は `docs/specs/` 配下です。タスク実行中に仕様変更が発生した場合は、関連するSSOT文書を同じ作業内で更新してください。

## 優先度B

## 優先度C

- [ ] Excel 出力と Alembic migration の Integration Test 運用を追加する
  - 目的: 出力物とDBスキーマ更新の壊れやすい境界を、既存単体テストだけに頼らず継続確認できるようにする。
  - 対象: `backend/tests/integration/`、`.github/workflows/quality.yml` または関連CI、`docs/specs/development-workflow.md`
  - 対応: Excel 出力 API の最小ITと `alembic upgrade head` を伴う migration 検証ITを追加し、PRごと実行と定期実行のどちらで回すかを CI に反映する。
  - 完了条件: Excel 出力物の基本妥当性と migration 成功が integration test として確認でき、CI の実行タイミングが文書と設定で一致している。
  - 根拠: `integration-test-plan.md` の優先度C「Excel出力」「Migration検証」を一段階下げ、優先度Cで導入する方針。
