# 未完了タスク

このファイルは未完了の実装タスクだけを管理します。

完了済みタスクは [完了済みタスク](completed.md) に退避しています。

仕様の正本は `docs/specs/` 配下です。タスク実行中に仕様変更が発生した場合は、関連するSSOT文書を同じ作業内で更新してください。

## 優先度A

- [ ] 予算管理機能を追加し、予算超過と進捗を確認できるようにする
  - 目的: 月中の支出が予算に対してどの程度進んでいるか、超過しているか、予定どおりかを判断できるようにする。
  - 対象: `backend/app/`、`frontend/src/features/`、`docs/specs/domain-model.md`、`docs/specs/api-specs.md`、`docs/specs/db-schema.md`、関連画面要件とE2E
  - 対応: 予算の単位と保持方法を仕様化したうえで、少なくとも月次またはカテゴリ別の予算設定、予算に対する実績・差額・進捗率・超過状態の表示を追加する。ダッシュボードや設定系画面のどこで確認・編集するかも含めてUIとAPIを整備し、必要な永続化、集計、テストを追加する。
  - 完了条件: ユーザーが予算額を設定でき、現在の支出が予算超過か、予定範囲内か、どの程度進んでいるかを画面で確認できる。関連仕様、API、DB、画面要件、E2Eが更新される。
  - 根拠: ユーザー依頼「予算管理できる機能を追加したい。どのくらい超えているのか？とか予定通りなのか？とか確認できるように。」。

## 優先度B

- [ ] E2E のhelperと代表シナリオを整理し、重複をIntegration Testへ寄せる
  - 目的: E2Eを実ブラウザ・実バックエンド・MySQLを含む代表導線に集中させ、実行時間と保守コストを抑える。
  - 対象: `frontend/e2e/`、`frontend/e2e/helpers/`、`frontend/scripts/reset-e2e-db.mjs`、`docs/e2e/index.md`、該当する `docs/e2e/*.md`
  - 対応: ログイン、年月操作、明細作成、削除確認、アップロード用データ準備などの重複操作をhelper化する。E2Eで細かく見すぎている表示分岐やAPI異常系は、Frontend Integration Test へ移せるか判断し、必要なタスクまたは実装へ反映する。
  - 完了条件: E2E spec が代表導線中心に読みやすくなり、共通操作は helper に集約され、移管した検証観点が Integration Test またはタスクとして追跡できる。
  - 根拠: E2Eの安定性と実行時間を守りながら、unit / integration / e2e の役割分担を明確にするため。

- [ ] 認証ガード対象ルートを棚卸しし、`/income-settings` を含む保護境界を実装とテストで一致させる
  - 目的: proxy とクライアント側401リダイレクトの責務を揃え、ページごとに認証導線が揺れない状態にする。
  - 対象: `frontend/proxy.ts`、`frontend/e2e/auth.spec.ts`、`frontend/e2e/income-settings.spec.ts`、必要に応じて `docs/specs/security.md`、`docs/specs/development-workflow.md`
  - 対応: 保護対象ルートと matcher を棚卸しし、`/income-settings` を含む主要画面が proxy で一貫してガードされるようにする。未ログイン時の server-side redirect と、認証切れ時の client-side redirect の住み分けもテストと文書で明確にする。
  - 完了条件: 保護画面の認証境界が route 一覧・matcher・E2E の期待値で一致し、未ログイン時の遷移が画面ごとに揺れない。
  - 根拠: `e2e-flaky-test-analysis.md` の「`/income-settings` が保護ルートに含まれていない」「認証境界の揺れが E2E を不安定化させる」という分析。

- [ ] `gotoAppPage()` と redirect系E2Eの待ち合わせを見直し、非同期完了前のassertを減らす
  - 目的: 見出し表示だけで画面安定とみなしている helper を改善し、URL同期・API取得・redirect 完了前の flaky failure を減らす。
  - 対象: `frontend/e2e/helpers/navigation.ts`、`frontend/e2e/auth.spec.ts`、`frontend/e2e/reports.spec.ts`、`frontend/e2e/dashboard.spec.ts`、必要に応じて `docs/e2e/index.md`
  - 対応: `gotoAppPage()` の待機条件をページ特性に応じて見直し、redirect-only route は専用の待ち合わせへ分離する。必要なら API 到達、URL 確定、主要コンポーネント表示のいずれを待つかを helper または spec 側で明示し、汎用 helper の責務を絞る。
  - 完了条件: redirect 系とデータ取得依存ページで共通 helper の誤用が減り、E2E が URL 同期や API 応答待ち不足で落ちにくくなる。対応方針が `docs/e2e/index.md` にも反映される。
  - 根拠: `e2e-flaky-test-analysis.md` の「`gotoAppPage()` が見出しだけを待っている」「redirect 系テストは専用に書くべき」という分析。

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
