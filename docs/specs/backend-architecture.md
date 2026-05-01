# バックエンド設計

## 方針

バックエンドは FastAPI で実装する。

DDDのレイヤ構成を保ち、ドメイン層を技術詳細から分離する。

## フォルダ構成

```text
backend/
└── app/
    ├── domain/
    ├── application/
    ├── infrastructure/
    └── presentation/
```

## レイヤ責務

### domain

- エンティティ
- 値オブジェクト
- 集約
- ドメインサービス
- リポジトリインターフェース
- ドメイン例外

外部ライブラリ、FastAPI、ORM、MySQL、PDF解析ライブラリに依存しない。

### application

- ユースケース
- トランザクション境界
- 入力DTOと出力DTO
- リポジトリインターフェースの呼び出し

画面表示の都合は持ち込まない。

### infrastructure

- MySQL接続
- ORM実装
- リポジトリ実装
- PDF解析実装
- ファイル保存実装
- JWT発行・検証の技術実装

### presentation

- FastAPIルーター
- リクエスト/レスポンススキーマ
- 認証依存関係
- Swagger/OpenAPI公開

## API仕様

- FastAPIが生成するOpenAPIを機械可読な正とする。
- Swagger UIでAPI仕様を確認できるようにする。
- ドメインモデルをAPIレスポンスとして直接返さず、DTOへ変換する。

## 認証

- 認証はJWTを使う。
- 認可対象データはログインユーザー本人のデータに限定する。
- JWTは HttpOnly Cookie に保存する。
- リフレッシュトークンを使う。
- アクセストークンの有効期限は15分とする。
- リフレッシュトークンの有効期限は5日とする。
- リフレッシュトークンはローテーションする。
- CSRF対策として `SameSite=Lax` とCSRFトークンヘッダーを使う。
- CSRFトークンは `GET /api/auth/csrf` で取得する。
- CSRFトークンはCookieには持たせず、レスポンスボディのみで返す。
- Cookieの `Secure` 属性は本番では `true`、ローカル開発では `false` とする。

## データベース

- MySQL 8.4を使う。
- ORMは SQLAlchemy、マイグレーションは Alembic を使う。
- UUIDはMySQL上では `CHAR(36)` として保存する。
- 金額は整数JPYとして保存し、マイナス金額は取消明細を表す。
- 日時はDBにUTCで保存する。
- アプリケーション上の基準タイムゾーンは `Asia/Tokyo` とする。
- 明細、カテゴリ、アップロード履歴は論理削除する。

## 確認事項

- JWTライブラリは何を使うか。
- アップロード済みPDFのパスを相対パスで保存するか。
- CSRFトークンの有効期限を何分にするか。
