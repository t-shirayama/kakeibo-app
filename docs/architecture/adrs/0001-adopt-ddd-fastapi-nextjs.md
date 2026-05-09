# ADR 0001: DDD、FastAPI、Next.jsを採用する

## ステータス

採用

## 背景

家計簿アプリでは、明細、カテゴリ、アップロード、集計、レポートなどの業務ルールを継続的に育てる必要がある。

UIやデータベースの都合にドメインルールが埋もれると、仕様変更時の影響範囲が広がる。

## 決定

- アーキテクチャはドメイン駆動設計（DDD）を採用する。
- バックエンドは FastAPI で開発する。
- フロントエンドは Next.js で開発する。
- フロントエンドは Next.js App Router を使う。
- データベースは MySQL 8.4 を使う。
- ORMは SQLAlchemy、マイグレーションは Alembic を使う。
- 認証はJWTを使う。
- JWTは HttpOnly Cookie に保存する。
- リフレッシュトークンを使う。
- アクセストークンの有効期限は15分、リフレッシュトークンの有効期限は5日とする。
- リフレッシュトークンはローテーションする。
- CSRF対策として `SameSite=Lax` とCSRFトークンヘッダーを使う。
- CSRFトークンは `GET /api/auth/csrf` で取得する。
- CSRFトークン本体はCookieには持たせず、レスポンスボディのみで返す。別途 HttpOnly のCSRFセッションCookieでブラウザセッションと結び付ける。
- CSRFトークンの有効期限は30分とする。
- Cookieの `Secure` 属性は本番では `true`、ローカル開発では `false` とする。
- JWTライブラリは PyJWT を使う。
- ユーザー登録は管理者が行う。
- パスワードは12文字以上とし、英大文字、英小文字、数字、記号をそれぞれ1文字以上含める。
- パスワードリセットを初期実装に含める。
- API契約の機械可読な正はFastAPIが生成するOpenAPIとし、Swagger UIで確認する。
- 初期のPDF取込対象は楽天カード明細PDFとし、ルールベースで抽出する。
- PDF抽出ライブラリは PyMuPDF を使う。
- アップロード済みPDFは原本としてローカルの `storage/uploads/` に保存し、ユーザーが削除するまで保持する。
- 楽天カード明細の利用者列は明細の独立項目として扱う。
- DB日時はUTCで保存し、表示時に `Asia/Tokyo` へ変換する。
- UUIDはMySQL上では `CHAR(36)` として保存する。
- 最大アップロードサイズは10MBとする。
- エクスポート形式はExcel（`.xlsx`）とする。
- Request/Response DTOの概要は `docs/specs/api-specs/` 配下に置き、厳密な機械可読仕様はPydantic/OpenAPIを正とする。
- スキーマ変更は後方互換な追加を基本とし、破壊的変更は仕様書とADRを更新してから行う。
- マイナス金額は取消明細を表す。
- 0円明細を許可する。
- 支払い方法は楽天PDFの値をそのまま保存する。
- 収入明細は支出明細と同じ `transactions` テーブルで扱い、`transaction_type` で区別する。
- 明細、カテゴリ、アップロード履歴は論理削除する。
- アップロード履歴を論理削除したとき、保存済みPDF原本も即削除する。
- UIライブラリは shadcn/ui と Tailwind CSS を使う。
- サーバー状態管理は TanStack Query を使う。
- APIクライアントはOpenAPIから自動生成する。
- 楽天カード明細PDFのテストデータは、抽出後テキストfixtureと期待値JSONで管理する。
- PDF原本の保存パスは `storage/uploads/{user_id}/{upload_id}/original.pdf` の相対パスとする。
- PDF取込時のカテゴリは、明示指定、店名キーワード分類ルール、同一店名・利用者・支払い方法の過去分類、未分類カテゴリの順で自動分類する。
- APIエラーは `error.code`, `error.message`, `error.details`, `error.request_id` を持つ共通形式で返す。
- ページネーションは `page` と `page_size` を使うoffset/page方式とする。
- APIとフロントDTOのID項目名はsnake_caseで統一する。
- Excel出力には明細一覧、カテゴリ集計、月別集計を含める。
- 明細編集、明細削除、アップロード失敗などを監査ログとして残す。
- `docs/specs/` を仕様書のSSOTとする。

## 結果

- ドメインルールはバックエンドのドメイン層に集約する。
- Next.js 側には業務判断を重複実装しない。
- API境界ではDTOを使い、ドメインモデルをそのまま公開しない。
- アーキテクチャ上の重要な決定はADRとして記録する。
