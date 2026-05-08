# API共通ルールと認証

## 共通ルール

- レスポンスはJSONを基本とする。
- 日付は `YYYY-MM-DD` を基本とする。
- 日時はISO 8601形式を基本とする。
- 金額は数値で返し、表示形式への変換はフロントエンドで行う。
- 変更操作は成功・失敗が判別できるレスポンスを返す。
- 認可対象のリソースはログインユーザー本人のデータに限定する。
- 認証が必要なAPIはHttpOnly CookieのJWTで認証する。
- エクスポート形式はExcel（`.xlsx`）とする。
- MVP対象APIのRequest/Response DTOは `README.md` に概要を固定し、厳密な機械可読仕様はPydantic/OpenAPIを正とする。
- スキーマ変更は後方互換な追加を基本とし、破壊的変更は仕様書とADRを更新してから行う。
- APIエラーは `error.code`, `error.message`, `error.details`, `error.request_id` を持つ共通形式で返す。
- 業務例外はapplication層の `ApplicationError` 系へ分類し、API層ではHTTPステータスへ変換する。`not found` などのメッセージ文字列でステータスを判定しない。
- 400は入力値・業務ルール違反、401は認証失敗、403は認可/CSRF失敗、404はログインユーザーから見えない対象リソースなし、500は想定外エラーに限定する。
- 想定外エラーでは内部詳細をレスポンスへ出さず、`Internal server error.` と `request_id` だけを返す。
- ページネーションは `page` と `page_size` を使うoffset/page方式とする。
- ID項目名は `transaction_id` などのsnake_caseで統一する。
- フロントDTOもsnake_caseのまま扱う。
- APIクライアントはOpenAPIから自動生成する。

## 認証

- `POST /api/auth/bootstrap-admin`
  - 初回管理者を作成する。`X-Admin-Setup-Token` とCSRFトークンヘッダーを必須とする。
- `POST /api/auth/admin/users`
  - 管理者がユーザーを作成する。
- `POST /api/auth/login`
  - ログインし、JWTを発行する。
- `POST /api/auth/refresh`
  - リフレッシュトークンを使ってアクセストークンを更新する。
- `POST /api/auth/logout`
  - ログアウトする。
- `GET /api/auth/me`
  - ログイン中ユーザーの情報を取得する。
- `GET /api/auth/csrf`
  - CSRFトークンをレスポンスボディで取得する。
  - あわせて、トークンを同一ブラウザセッションへ結び付けるための HttpOnly CSRF Cookie を設定または再利用する。
  - レスポンスは `Cache-Control: no-store` とし、古いCSRFトークン本文だけがキャッシュ再利用されないようにする。
- `POST /api/auth/password-reset`
  - パスワードリセットを開始する。
  - 本番相当環境では常に `{"status": "ok"}` を返し、登録済みユーザーかどうかやリセットトークンはレスポンスから判別できないようにする。
  - `local` / `test` 環境では検証用に `reset_token` を返してよい。
- `POST /api/auth/password-reset/confirm`
  - パスワードリセットを完了する。
