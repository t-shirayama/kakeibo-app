# フロントエンド設計

## 方針

フロントエンドは Next.js で実装し、App Router を使う。

Next.js 側には業務判断を重複実装せず、ドメインルールはバックエンドAPIへ委譲する。

UIライブラリは shadcn/ui と Tailwind CSS を使う。

サーバー状態管理は TanStack Query を使う。グローバル状態は最小限にする。

APIクライアントはOpenAPIから自動生成する。

## ルーティング

画面要件に合わせ、以下のルートを基本案とする。

- `/dashboard`
- `/calendar`
- `/transactions`
- `/income-settings`
- `/categories`
- `/upload`
- `/settings`

`/reports` は互換導線として残し、`/dashboard` へリダイレクトする。

## ナビゲーション

- サイドナビでは現在ページのリンクを背景と左線で強調し、`aria-current="page"` を付与する。
- サイドナビにはレポート、カレンダー、明細一覧、収入設定、アップロード、カテゴリ管理、設定を並べる。
- デスクトップ表示では、設定リンクを主要画面リンク群から分離してサイドバー下部に配置する。

## 責務

- 画面表示
- フォーム操作
- API呼び出し
- クライアント側のUI状態管理
- ローディング、エラー、空状態の表示
- APIエラーは `error.code`, `error.message`, `error.details`, `error.request_id` の共通形式として扱う。

## API連携

- API契約はFastAPIのOpenAPIを正とする。
- OpenAPI生成クライアントは `frontend/src/lib/generated/openapi-client.ts` を正とし、`backend/scripts/generate_openapi_client.py` で更新する。
- 画面表示に必要なデータはAPI DTOとして受け取る。
- フロントDTOはsnake_caseのまま扱う。
- 金額表示、日付表示などの表示整形はフロントエンドで行う。
- 業務ルールの判定はバックエンドに委譲する。
- APIエラーはバックエンド共通形式を `ApiError` と `ApiErrorAlert` で扱う。
- 手書きAPI呼び出しは `src/lib/api.ts` に集約し、生成クライアント導入後も画面側の呼び出し口を安定させる。
- カテゴリ名・色・未分類扱いなどの表示ルールは、API DTOまたは `src/lib/` の共有ヘルパーを通して利用し、画面単位で推測しない。

## 認証

- 認証はJWTを使う。
- JWTは HttpOnly Cookie に保存する。
- リフレッシュトークンを使う。
- Cookieは `SameSite=Lax` を使う。
- CSRFトークンヘッダーをAPIリクエストに付与する。
- CSRFトークンは `GET /api/auth/csrf` で取得する。
- CSRFトークンはCookieには持たせず、レスポンスボディのみで受け取る。
- CSRFトークンはフロントエンドのメモリに保持し、期限切れまたは403時に再取得する。
- Cookieの `Secure` 属性は本番では `true`、ローカル開発では `false` とする。
- 認証が必要な画面は未ログイン時にログイン画面へ誘導する。
- 未ログイン誘導は `NEXT_PUBLIC_AUTH_GUARD_ENABLED=true` の場合にmiddlewareで有効化する。
- middlewareの判定はバックエンドのアクセストークンCookie `kakeibo_access` を見る。
