# セキュリティ仕様

## 認証

認証はJWTを使う。

## 認可

- 一覧、集計、レポート、設定、アップロード履歴はログインユーザー本人のデータのみを扱う。
- APIではリクエストされたリソースの所有者を必ず検証する。
- APIレスポンスには共通セキュリティヘッダーとして `X-Content-Type-Options: nosniff` と `Cross-Origin-Resource-Policy: same-origin` を付与する。

## パスワード

- パスワードはハッシュ化して保存する。
- 平文パスワードをDBやログに保存しない。
- パスワードは12文字以上とし、英大文字、英小文字、数字、記号をそれぞれ1文字以上含める。
- パスワードリセットを初期実装に含める。
- ユーザー登録は管理者が行う。
- 初回管理者は `ADMIN_SETUP_TOKEN` と `POST /api/auth/bootstrap-admin` で作成する。
- 初回管理者作成後のユーザー作成は管理者JWTを必須とする。
- パスワードリセット開始APIは、本番相当環境では常に同一の成功レスポンスを返し、登録済みユーザーの有無やリセットトークンをレスポンスから判別できないようにする。
- 検証用のリセットトークン返却は `local` / `test` 環境だけに限定する。

## JWT

- JWTは HttpOnly Cookie に保存する。
- リフレッシュトークンを使う。
- リフレッシュトークンはDBにハッシュ化して保存する。
- パスワードリセットトークンはDBにハッシュ化して保存する。
- アクセストークンの有効期限は15分とする。
- リフレッシュトークンの有効期限は5日とする。
- リフレッシュトークンはローテーションする。
- ログアウト時はリフレッシュトークンを失効させる。
- CSRF対策として `SameSite=Lax` とCSRFトークンヘッダーを使う。
- CSRFトークンは `GET /api/auth/csrf` で取得する。
- CSRFトークン自体はCookieへ保存せず、レスポンスボディのみで返す。
- `GET /api/auth/csrf` では、トークン本体とは別に、セッション紐づけ用の HttpOnly CSRF Cookie を発行または再利用する。
- `GET /api/auth/csrf` のレスポンスはキャッシュさせず、ブラウザや中間層が古いトークン本文だけを再利用しないようにする。
- 変更系APIでは、CSRFトークンヘッダーとCSRFセッションCookieの組み合わせが一致した場合だけ受け付ける。
- CSRFトークンの有効期限は30分とする。
- Cookieの `Secure` 属性は本番では `true`、ローカル開発では `false` とする。
- 認証が必要なAPIはHttpOnly CookieのJWTで認証する。

## 本番向けCookie運用

- 本番環境では `COOKIE_SECURE=true` を必須とし、HTTP配信ではなくHTTPS配信を前提にする。
- Cookieの `SameSite` は現行実装では `Lax` 固定とし、`kakeibo_access`、`kakeibo_refresh`、`kakeibo_csrf_session` の3種類すべてに同じ属性を付与する。
- ローカル開発では `COOKIE_SECURE=false` を使い、`http://localhost` 上の動作確認を優先する。
- 本番デプロイ前には、ログイン後の `Set-Cookie` をブラウザ開発者ツールまたはプロキシで確認し、少なくとも `HttpOnly`、`Secure`、`SameSite=Lax`、`Path=/` が付いていることを確認する。
- `GET /api/auth/csrf` 実行時に `kakeibo_csrf_session` が `HttpOnly`、`Secure`、`SameSite=Lax` 付きで再利用または発行されることを確認する。
- フロントエンドとバックエンドを別サイトとして運用する場合、`SameSite=Lax` のままではCookie認証とCSRFフローが成立しない可能性があるため、本番投入前にCookie方針を見直す。

## ファイルアップロード

- PDFファイルのみを受け付ける。
- 空または不正なmultipart入力は内部エラーにせず、400または422のAPIエラーとして返す。
- 最大アップロードサイズは10MBとする。
- 解析できないPDFは失敗として履歴に残す。
- アップロード済みPDFは原本として保存する。
- 保存先はローカルの `storage/uploads/` とする。
- 保存パスは `storage/uploads/{user_id}/{upload_id}/original.pdf` の相対パスとする。
- アップロード済みPDFはユーザーが削除するまで保存する。
- ユーザー削除時は保存済みPDF原本をストレージから削除する。
- アップロード履歴を論理削除したとき、保存済みPDF原本も即削除する。

## データ削除

- 全データ削除APIは確認文字列 `DELETE` またはパスワード再入力を必須とする。
- 全データ削除時は明細、未分類以外のカテゴリ、アップロード履歴、収入設定を論理削除し、収入設定の月別変更を削除する。`未分類` カテゴリは残す。ユーザー自体は削除しない。
- 全データ削除時はリフレッシュトークンを失効し、パスワードリセットトークンを使用済みにする。
- 全データ削除時は保存済みPDF原本をストレージから削除し、認証Cookieも削除する。

## UIとクライアント連携

- Next.js の proxy では `/dashboard`、`/calendar`、`/transactions`、`/upload`、`/categories`、`/income-settings`、`/reports`、`/settings` を保護対象とし、未ログインの初回遷移ではサーバーサイドで `/login?redirect=...` へリダイレクトする。
- 認証済み画面で 401 が返った後の refresh 失敗時は、クライアント側の認証 helper がログイン画面への再誘導を担当する。
- CSRFトークンはフロントエンドのメモリに保持し、期限切れまたは403時に再取得する。
- フロントエンドは `credentials: "include"` でCSRF取得APIを呼び、ブラウザに保存されたHttpOnlyのCSRFセッションCookieを自動送信する。

## セキュリティスキャン

- OWASP ZAPのローカルAPIスキャンはDocker Composeの `zap` サービスで実行する。
- `zap` サービスは `security` profile に属し、通常の `docker compose up` では起動しない。
- ZAPは公式イメージ `ghcr.io/zaproxy/zaproxy:stable` を使う。
- 対象OpenAPI定義は `http://backend:8000/openapi.json` とする。
- ZAP実行前に `python -m app.bootstrap.seed_sample_data --reset` でサンプルユーザーを投入する。
- ZAP実行前に `http://backend:8000/api/health` の成功を待つ。
- ZAP実行時は `GET /api/auth/csrf` でCSRFトークンを取得し、サンプルユーザーで `POST /api/auth/login` して認証Cookieを取得する。
- ZAPにはBearerトークンではなく、ログイン時にSet-CookieされたHttpOnly認証Cookieと `X-CSRF-Token` ヘッダーを渡す。
- ZAPレポートは `zap-reports/` にHTML、JSON、Markdownで出力し、Git管理対象外とする。
