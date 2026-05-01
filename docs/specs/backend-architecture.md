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
- JWTの保存場所、リフレッシュトークンの有無、有効期限は未決定。

## データベース

- MySQLを使う。
- 金額は整数JPYとして保存する。
- 日時はDBに保存する。
- アプリケーション上の基準タイムゾーンは `Asia/Tokyo` とする。

## 確認事項

- ORMはSQLAlchemyでよいか。
- マイグレーションはAlembicでよいか。
- JWTライブラリは何を使うか。
- DBに保存する日時はUTCに寄せるか、Asia/Tokyo基準で保存するか。
