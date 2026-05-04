# バックエンド設計

## 方針

バックエンドは FastAPI で実装する。

DDDのレイヤ構成を保ち、ドメイン層を技術詳細から分離する。

## フォルダ構成

```text
backend/
└── app/
    ├── bootstrap/
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
- リポジトリやストレージなどのProtocolの定義と呼び出し

画面表示の都合は持ち込まない。
infrastructure層のRepository実装、Storage実装、PDFパーサ実装などの具象クラスへ直接依存しない。

- 明細操作ユースケースとカテゴリ管理ユースケースは分離する。
- レポート集計ユースケースは集計結果の生成に集中し、Excelなどの出力形式組み立ては別コンポーネントへ委譲する。
- PDF取込ユースケースは、アップロード履歴RepositoryとPDF原本Storageをapplication層のProtocolとして受け取り、具象実装は外側の層で注入する。

### bootstrap

- Repository、Storage、Parser、Settingsなどの具象実装を組み立て、application層のユースケースへ注入する。
- presentation層に依存配線の詳細を持ち込まず、HTTP入出力の責務へ集中させる。

### infrastructure

- MySQL接続
- ORM実装
- リポジトリ実装
- PDF解析実装
- ファイル保存実装
- JWT発行・検証の技術実装
- PyMuPDFを使ったPDF抽出実装
- 監査ログ永続化

- 明細の保存/更新、カテゴリの保存/更新、一覧検索クエリ、監査ログ永続化は別々のリポジトリまたはコンポーネントとして分離する。

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
- CSRFトークンの有効期限は30分とする。
- Cookieの `Secure` 属性は本番では `true`、ローカル開発では `false` とする。
- JWTライブラリは PyJWT を使う。
- ユーザー登録は管理者が行う。
- パスワードは12文字以上とし、英大文字、英小文字、数字、記号をそれぞれ1文字以上含める。
- パスワードリセットを初期実装に含める。

## データベース

- MySQL 8.4を使う。
- ORMは SQLAlchemy、マイグレーションは Alembic を使う。
- UUIDはMySQL上では `CHAR(36)` として保存する。
- 金額は整数JPYとして保存し、マイナス金額は取消明細を表す。
- 0円明細を許可する。
- 日時はDBにUTCで保存する。
- アプリケーション上の基準タイムゾーンは `Asia/Tokyo` とする。
- 明細、カテゴリ、アップロード履歴は論理削除する。
