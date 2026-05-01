# API仕様

## 方針

バックエンドは FastAPI で実装する。

フロントエンドは Next.js からAPIを呼び出す。APIはDTOを返し、ドメインモデルをそのまま外部公開しない。

API契約の機械可読な正は、FastAPIが生成するOpenAPIとする。開発時はSwagger UIでAPI仕様を確認できるようにする。

## 共通ルール

- レスポンスはJSONを基本とする。
- 日付は `YYYY-MM-DD` を基本とする。
- 日時はISO 8601形式を基本とする。
- 金額は数値で返し、表示形式への変換はフロントエンドで行う。
- 変更操作は成功・失敗が判別できるレスポンスを返す。
- 認可対象のリソースはログインユーザー本人のデータに限定する。
- 認証はJWTを使う。
- JWTは HttpOnly Cookie に保存する。
- リフレッシュトークンを使う。
- アクセストークンの有効期限は15分とする。
- リフレッシュトークンの有効期限は5日とする。
- リフレッシュトークンはローテーションする。
- CSRF対策として `SameSite=Lax` とCSRFトークンヘッダーを使う。
- CSRFトークンは `GET /api/auth/csrf` で取得する。
- CSRFトークンはCookieには持たせず、レスポンスボディのみで返す。
- 認証が必要なAPIはHttpOnly CookieのJWTで認証する。
- エクスポート形式はExcel（`.xlsx`）とする。
- MVP対象APIのRequest/Response DTOは `api-specs.md` に概要を固定し、厳密な機械可読仕様はPydantic/OpenAPIを正とする。
- スキーマ変更は後方互換な追加を基本とし、破壊的変更は仕様書とADRを更新してから行う。
- APIエラーは `error.code`, `error.message`, `error.details`, `error.request_id` を持つ共通形式で返す。
- ページネーションは `page` と `page_size` を使うoffset/page方式とする。
- ID項目名は `transaction_id` などのsnake_caseで統一する。
- フロントDTOもsnake_caseのまま扱う。

## 認証

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
- `POST /api/auth/password-reset`
  - パスワードリセットを開始する。
- `POST /api/auth/password-reset/confirm`
  - パスワードリセットを完了する。

## エンドポイント案

### ダッシュボード

- `GET /api/dashboard/summary`
  - 対象月の支出合計、収入合計、収支、取引件数、前月比を返す。
- `GET /api/dashboard/recent-transactions`
  - 最近の明細を日付降順で返す。

### 明細

- `GET /api/transactions`
  - 明細一覧を検索、期間、カテゴリ、ページ指定で取得する。
- `POST /api/transactions`
  - 明細を手動登録する。
- `GET /api/transactions/{transaction_id}`
  - 明細詳細を取得する。
- `PUT /api/transactions/{transaction_id}`
  - 明細を更新する。
- `DELETE /api/transactions/{transaction_id}`
  - 明細を削除する。
- `GET /api/transactions/export`
  - 明細一覧、カテゴリ集計、月別集計を含むExcel（`.xlsx`）をエクスポートする。

### カテゴリ

- `GET /api/categories`
  - カテゴリ一覧を取得する。
- `POST /api/categories`
  - カテゴリを追加する。
- `PUT /api/categories/{category_id}`
  - カテゴリを更新する。
- `DELETE /api/categories/{category_id}`
  - カテゴリを削除または無効化する。

### アップロード

- `POST /api/uploads`
  - PDFファイルをアップロードする。
- `GET /api/uploads`
  - アップロード履歴を取得する。
- `GET /api/uploads/{upload_id}`
  - アップロード結果を取得する。

### レポート

- `GET /api/reports/monthly`
  - 月別支出推移を取得する。
- `GET /api/reports/categories`
  - カテゴリ別支出割合と推移を取得する。

### 設定

- `GET /api/settings`
  - ユーザー設定を取得する。
- `PUT /api/settings`
  - ユーザー設定を更新する。
- `POST /api/settings/export`
  - 明細一覧、カテゴリ集計、月別集計を含むExcel（`.xlsx`）をエクスポートする。
- `DELETE /api/settings/data`
  - ユーザーデータを削除する。
