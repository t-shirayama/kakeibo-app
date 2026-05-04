# 未完了タスク

このファイルは未完了の実装タスクだけを管理します。

完了済みタスクは [完了済みタスク](completed.md) に退避しています。

仕様の正本は `docs/specs/` 配下です。タスク実行中に仕様変更が発生した場合は、関連するSSOT文書を同じ作業内で更新してください。

## 優先度A

- [ ] 初期デザイン案をアーカイブへ移し、現行画面スクリーンショットを正本へ置き換える
  - 目的: 現在の実装とデザイン参照先の差分を減らし、README から最新の画面イメージへ迷わず辿れるようにする。
  - 対象: `docs/designs/`、必要に応じて `docs/designs/archive/`、`README.md`、`docs/README.md`、関連する画面要件
  - 対応: 初期構想として使っていた旧デザイン素材をアーカイブ配下へ移し、現行の画面スクリーンショットを `docs/designs/` の主要参照物へ差し替える。あわせて `README.md` から画面イメージを参照・表示できる導線を追加し、関連文書のリンクを新構成へ合わせる。
  - 完了条件: 初期案と現行画面イメージの置き場が分離され、README から現在の画面イメージを確認できる。画面要件や docs 入口の参照先も新構成と矛盾しない。
  - 根拠: ユーザー依頼「designの初期構想をアーカイブに移動して現在の画面スクショに置き換えてほしい。そしてREADME.mdに画面イメージを参照して表示するようにしたい。」。

- [ ] 予算管理機能を追加し、予算超過と進捗を確認できるようにする
  - 目的: 月中の支出が予算に対してどの程度進んでいるか、超過しているか、予定どおりかを判断できるようにする。
  - 対象: `backend/app/`、`frontend/src/features/`、`docs/specs/domain-model.md`、`docs/specs/api-specs.md`、`docs/specs/db-schema.md`、関連画面要件とE2E
  - 対応: 予算の単位と保持方法を仕様化したうえで、少なくとも月次またはカテゴリ別の予算設定、予算に対する実績・差額・進捗率・超過状態の表示を追加する。ダッシュボードや設定系画面のどこで確認・編集するかも含めてUIとAPIを整備し、必要な永続化、集計、テストを追加する。
  - 完了条件: ユーザーが予算額を設定でき、現在の支出が予算超過か、予定範囲内か、どの程度進んでいるかを画面で確認できる。関連仕様、API、DB、画面要件、E2Eが更新される。
  - 根拠: ユーザー依頼「予算管理できる機能を追加したい。どのくらい超えているのか？とか予定通りなのか？とか確認できるように。」。

## 優先度B

- [ ] Backend Integration Test の基盤と最重要シナリオを導入する
  - 目的: Unit Test と E2E の間を埋め、認証・CSRF・明細操作・月次集計の結合不具合を早期に検出できるようにする。
  - 対象: `backend/tests/integration/`、`backend/pyproject.toml` または pytest 設定、必要に応じて `docker-compose.yml`、`docs/specs/development-workflow.md`、`docs/e2e/index.md`
  - 対応: pytest marker と Integration Test 用ディレクトリ構成を追加し、少なくとも認証/CSRF、明細登録〜一覧取得、月次レポート集計を API と MySQL を通して検証するテストを導入する。Docker Compose 前提の実行手順と CI での位置づけも文書化する。
  - 完了条件: `backend/tests/integration/` に最小セットのITが追加され、Docker Compose 上で再現可能に実行できる。認証・CSRF・明細・月次集計の主要な結合経路を既存E2Eに依存せず検証できる。
  - 根拠: `integration-test-plan.md` の優先度A「認証・Cookie・CSRF」「明細登録・取得・更新・削除」「月次レポート・集計」を一段階下げて導入する方針。

- [ ] Frontend Integration Test の基盤と主要画面テストを導入する
  - 目的: API mock を使った軽量な画面結合テストで、ログイン、明細一覧、月次レポートの表示と再取得の退行を防ぐ。
  - 対象: `frontend/src/test/`、`frontend/src/features/**/__tests__/`、`frontend/package.json`、必要に応じて `docs/specs/development-workflow.md`、`docs/e2e/index.md`
  - 対応: Vitest、React Testing Library、MSW、user-event、jsdom の実行基盤を追加し、少なくともログイン画面、明細一覧、ダッシュボード/月次集計相当画面の主要表示・エラー表示・再取得を検証するテストを実装する。
  - 完了条件: Frontend Integration Test をコンテナ内で実行でき、主要画面の API クライアント連携を E2E より軽量に検証できる。セットアップ手順とテストの住み分けも文書化されている。
  - 根拠: `integration-test-plan.md` の優先度A「ログイン画面」「明細一覧」「月次レポート」を一段階下げて導入する方針。

## 優先度C

- [ ] Backend Integration Test をカテゴリ管理と PDF 取込へ拡張する
  - 目的: 明細周辺の関連機能まで結合テストのカバレッジを広げ、ユーザー分離や PDF 取込の主要失敗ケースを守る。
  - 対象: `backend/tests/integration/`、必要に応じて PDF fixture、`docs/specs/pdf-import.md`、`docs/specs/development-workflow.md`
  - 対応: カテゴリ作成・一覧・明細紐づけ・使用中カテゴリの仕様確認と、PDFアップロード〜解析/取込確定または異常系の最小ITを追加する。重いケースを通常PRと定期実行でどう分けるかも整理する。
  - 完了条件: カテゴリ管理と PDF 取込の主要経路が integration marker で実行でき、通常実行と重いITの運用方針が文書化されている。
  - 根拠: `integration-test-plan.md` の優先度B「カテゴリ管理」「PDF取込」を一段階下げて導入する方針。

- [ ] Frontend Integration Test を明細フォーム、PDFアップロード、CSRF再試行へ拡張する
  - 目的: 主要操作と最近強化した認証/CSRF自己回復のUI挙動を、ブラウザE2Eに頼りすぎず検証できるようにする。
  - 対象: `frontend/src/features/**/__tests__/`、`frontend/src/test/msw/`、`frontend/src/lib/api/`、必要に応じて `docs/specs/frontend-architecture.md`、`docs/specs/development-workflow.md`
  - 対応: 明細登録・編集フォーム、PDFアップロード画面、401/403時の refresh・CSRF再取得・再試行挙動を MSW ベースの Integration Test へ追加する。
  - 完了条件: フロント主要操作と CSRF エラー回復が Frontend IT で再現でき、E2E は代表導線に集中できる状態になる。
  - 根拠: `integration-test-plan.md` の優先度B「明細登録・編集フォーム」「PDFアップロード」「認証切れ・CSRFエラー時の挙動」を一段階下げて導入する方針。

- [ ] Excel 出力と Alembic migration の Integration Test 運用を追加する
  - 目的: 出力物とDBスキーマ更新の壊れやすい境界を、既存単体テストだけに頼らず継続確認できるようにする。
  - 対象: `backend/tests/integration/`、`.github/workflows/quality.yml` または関連CI、`docs/specs/development-workflow.md`
  - 対応: Excel 出力 API の最小ITと `alembic upgrade head` を伴う migration 検証ITを追加し、PRごと実行と定期実行のどちらで回すかを CI に反映する。
  - 完了条件: Excel 出力物の基本妥当性と migration 成功が integration test として確認でき、CI の実行タイミングが文書と設定で一致している。
  - 根拠: `integration-test-plan.md` の優先度C「Excel出力」「Migration検証」を一段階下げ、優先度Cで導入する方針。
