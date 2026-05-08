# フロントエンド設計

## 方針

フロントエンドは Next.js で実装し、App Router を使う。

Next.js 側には業務判断を重複実装せず、ドメインルールはバックエンドAPIへ委譲する。

UIライブラリは shadcn/ui と Tailwind CSS を使う。

UIフォントは `frontend/app/globals.css` のCSS変数を正とする。本文・UIは Fontsource 経由で自己ホストする `Noto Sans JP Variable` を優先し、コードや等幅表示は `JetBrains Mono`、`Fira Code` を優先する。

サーバー状態管理は TanStack Query を使う。グローバル状態は最小限にする。

APIクライアントはOpenAPIから自動生成する。

## ルーティング

画面要件に合わせ、以下のルートを基本案とする。

- `/dashboard`
- `/calendar`
- `/transactions`
- `/income-settings`
- `/budgets`
- `/audit-logs`
- `/categories`
- `/upload`
- `/settings`

`/reports` は互換導線として残し、`/dashboard` へリダイレクトする。

## ナビゲーション

- サイドナビでは現在ページのリンクを背景と左線で強調し、`aria-current="page"` を付与する。
- サイドナビにはダッシュボード、カレンダー、明細一覧、収入設定、予算管理、アップロード、カテゴリ管理、監査ログ、設定を並べる。
- デスクトップ表示では、監査ログと設定のリンクを主要画面リンク群から分離してサイドバー下部に配置する。

## 責務

- 画面表示
- フォーム操作
- API呼び出し
- クライアント側のUI状態管理
- ローディング、エラー、空状態の表示
- APIエラーは `error.code`, `error.message`, `error.details`, `error.request_id` の共通形式として扱う。

## ディレクトリ構成

- `frontend/app/(app)/*/page.tsx` はルーティング入口に限定し、主要な業務画面の実体は `frontend/src/features/*` 配下に置く。
- `frontend/src/features/reports` はダッシュボード・レポート系の画面実装と、その画面専用コンポーネントを持つ。
- `frontend/src/features/calendar` はカレンダー画面の実装と、その画面専用の query key や補助ロジックを持つ。
- `frontend/src/features/transactions` は明細一覧画面の実装を持つ。
- `frontend/src/features/uploads` はPDFアップロード画面の実装を持つ。
- `frontend/src/features/income-settings` は収入設定画面の実装を持つ。
- `frontend/src/features/budgets` は予算管理画面の実装を持つ。
- `frontend/src/features/settings` は設定画面で使う server state の key 定義など、設定画面に閉じた要素を持つ。
- TanStack Query の query key 定義は、原則として各 feature 配下の `queryKeys.ts` へ置き、画面側で配列を直書きしない。
- `frontend/src/components` には複数画面で再利用する共通UIだけを置く。
- `収入` `支出` `収支` のテーマカラーは `frontend/app/globals.css` の CSS 変数を正とし、金額表示やアイコンを含めて画面やコンポーネントで色コードを直書きして増やさない。
- フォント指定は `frontend/app/globals.css` の `--font-sans` と `--font-mono` を正とし、個別画面やコンポーネントでフォントファミリーを直書きしない。

## API連携

- API契約はFastAPIのOpenAPIを正とする。
- OpenAPI生成クライアントは `frontend/src/lib/generated/openapi-client.ts` を正とし、`backend/scripts/generate_openapi_client.py` で更新する。
- 画面表示に必要なデータはAPI DTOとして受け取る。
- フロントDTOはsnake_caseのまま扱う。
- 金額表示、日付表示などの表示整形はフロントエンドで行う。
- 業務ルールの判定はバックエンドに委譲する。
- APIエラーはバックエンド共通形式を `ApiError` と `ApiErrorAlert` で扱う。
- 手書きAPI呼び出しの公開口は `src/lib/api.ts` に保ちつつ、実装は `src/lib/api/` 配下で transport、認証再試行、download、upload、feature別呼び出し口へ分割して管理する。
- カテゴリ名・色・未分類扱いなどの表示ルールは、API DTOまたは `src/lib/` の共有ヘルパーを通して利用し、画面単位で推測しない。

## 認証

- 認証はJWTを使う。
- JWTは HttpOnly Cookie に保存する。
- リフレッシュトークンを使う。
- Cookieは `SameSite=Lax` を使う。
- CSRFトークンヘッダーをAPIリクエストに付与する。
- CSRFトークンは `GET /api/auth/csrf` で取得する。
- CSRFトークン自体はCookieには持たせず、レスポンスボディのみで受け取る。
- ブラウザにはトークン本体と別に HttpOnly のCSRFセッションCookieを保持し、`credentials: "include"` で自動送信する。
- CSRFトークンはフロントエンドのメモリに保持し、期限切れまたは403時に再取得する。
- Cookieの `Secure` 属性は本番では `true`、ローカル開発では `false` とする。
- 認証が必要な画面は未ログイン時にログイン画面へ誘導する。
- 未ログイン誘導は `NEXT_PUBLIC_AUTH_GUARD_ENABLED=true` の場合にproxyで有効化する。
- proxyの判定はバックエンドのアクセストークンCookie `kakeibo_access` を見る。
