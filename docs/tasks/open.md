# 未完了タスク

このファイルは未完了の実装タスクだけを管理します。

完了済みタスクは [完了済みタスク](completed.md) に退避しています。

仕様の正本は `docs/specs/` 配下です。タスク実行中に仕様変更が発生した場合は、関連するSSOT文書を同じ作業内で更新してください。

## 優先度B

## 優先度C

- [ ] Backend Integration Test をカテゴリ管理と PDF 取込へ拡張する
  - 目的: 明細周辺の関連機能まで結合テストのカバレッジを広げ、ユーザー分離や PDF 取込の主要失敗ケースを守る。
  - 対象: `backend/tests/integration/`、必要に応じて PDF fixture、`docs/specs/pdf-import.md`、`docs/specs/development-workflow.md`
  - 対応: カテゴリ作成・一覧・明細紐づけ・使用中カテゴリの仕様確認と、PDFアップロード〜解析/取込確定または異常系の最小ITを追加する。重いケースを通常PRと定期実行でどう分けるかも整理する。
  - 完了条件: カテゴリ管理と PDF 取込の主要経路が integration marker で実行でき、通常実行と重いITの運用方針が文書化されている。
  - 根拠: `integration-test-plan.md` の優先度B「カテゴリ管理」「PDF取込」を一段階下げて導入する方針。

- [ ] Frontend Integration Test を明細フォーム、PDFアップロード、CSRF再試行へ拡張する
  - 目的: 主要操作と最近強化した認証/CSRF自己回復のUI挙動を、ブラウザE2Eに頼りすぎず検証できるようにする。
  - 対象: `frontend/src/test/integration/`、`frontend/src/test/msw/`、`frontend/src/lib/api/`、必要に応じて `docs/specs/frontend-architecture.md`、`docs/specs/development-workflow.md`
  - 対応: 明細登録・編集フォーム、PDFアップロード画面、401/403時の refresh・CSRF再取得・再試行挙動を MSW ベースの Integration Test へ追加する。
  - 完了条件: フロント主要操作と CSRF エラー回復が Frontend IT で再現でき、E2E は代表導線に集中できる状態になる。
  - 根拠: `integration-test-plan.md` の優先度B「明細登録・編集フォーム」「PDFアップロード」「認証切れ・CSRFエラー時の挙動」を一段階下げて導入する方針。

- [ ] Excel 出力と Alembic migration の Integration Test 運用を追加する
  - 目的: 出力物とDBスキーマ更新の壊れやすい境界を、既存単体テストだけに頼らず継続確認できるようにする。
  - 対象: `backend/tests/integration/`、`.github/workflows/quality.yml` または関連CI、`docs/specs/development-workflow.md`
  - 対応: Excel 出力 API の最小ITと `alembic upgrade head` を伴う migration 検証ITを追加し、PRごと実行と定期実行のどちらで回すかを CI に反映する。
  - 完了条件: Excel 出力物の基本妥当性と migration 成功が integration test として確認でき、CI の実行タイミングが文書と設定で一致している。
  - 根拠: `integration-test-plan.md` の優先度C「Excel出力」「Migration検証」を一段階下げ、優先度Cで導入する方針。
