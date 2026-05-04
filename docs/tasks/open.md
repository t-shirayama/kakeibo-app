# 未完了タスク

このファイルは未完了の実装タスクだけを管理します。

完了済みタスクは [完了済みタスク](completed.md) に退避しています。

仕様の正本は `docs/specs/` 配下です。タスク実行中に仕様変更が発生した場合は、関連するSSOT文書を同じ作業内で更新してください。

- [ ] ZAP: 不正なPDFアップロード入力で500を返さないようにする
  - 対象: `POST /api/uploads`
  - 対応: 空または不正なmultipart入力を400または422のAPIエラーとして返し、内部エラー表示を抑制する。
  - 完了条件: 修正後に `docker compose run --rm zap` を再実行し、対象の500系アラートが解消されたことを確認する。
  - 根拠: `zap-reports/zap-api-report.md` の `A Server Error response code was returned by the server` / `Application Error Disclosure` / `Information Disclosure - Debug Error Messages`

- [ ] ZAP: APIレスポンスへ基本セキュリティヘッダーを付与する
  - 対象: `X-Content-Type-Options`, `Cross-Origin-Resource-Policy`
  - 対応: FastAPIの共通middlewareなどでAPI全体へ適切なヘッダーを付与する。
  - 完了条件: 修正後に `docker compose run --rm zap` を再実行し、対象ヘッダー不足のアラートが解消されたことを確認する。
  - 根拠: `zap-reports/zap-api-report.md` の `X-Content-Type-Options Header Missing` / `Cross-Origin-Resource-Policy Header Missing or Invalid`
