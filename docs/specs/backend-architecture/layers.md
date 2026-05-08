# バックエンドレイヤ責務

## domain

- エンティティ
- 値オブジェクト
- 集約
- ドメインサービス
- リポジトリインターフェース
- ドメイン例外

外部ライブラリ、FastAPI、ORM、MySQL、PDF解析ライブラリに依存しない。

## application

- ユースケース
- トランザクション境界
- 入力DTOと出力DTO
- リポジトリやストレージなどのProtocolの定義と呼び出し

画面表示の都合は持ち込まない。
infrastructure層のRepository実装、Storage実装、PDFパーサ実装などの具象クラスへ直接依存しない。

機能ごとの責務が大きくなった場合は、`app/application/<feature>/` のようにディレクトリで分割し、`commands`、`ports`、`policies`、`use_cases` を見つけやすく保つ。
`settings` のように Repository Protocol や保存先 Protocol を持つ機能も、可能なら feature ディレクトリ配下の `ports.py` へ寄せて配置をそろえる。

- 明細操作ユースケースとカテゴリ管理ユースケースは分離する。
- レポート集計ユースケースは集計結果の生成に集中し、Excelなどの出力形式組み立ては別コンポーネントへ委譲する。
- PDF取込ユースケースは、アップロード履歴RepositoryとPDF原本Storageをapplication層のProtocolとして受け取り、具象実装は外側の層で注入する。
- ユーザーデータ全削除のように複数集約を横断する破壊的操作は、画面設定の更新ユースケースへ混ぜず、専用ユースケースとして分離する。
- JWT、CSRFトークン、パスワードハッシュ、トークンハッシュの具象アルゴリズムはapplication層へ置かず、application層はProtocolを通して呼び出す。

## bootstrap

- Repository、Storage、Parser、Settingsなどの具象実装を組み立て、application層のユースケースへ注入する。
- presentation層に依存配線の詳細を持ち込まず、HTTP入出力の責務へ集中させる。

## infrastructure

- MySQL接続
- ORM実装
- リポジトリ実装
- PDF解析実装
- ファイル保存実装
- JWT発行・検証の技術実装
- CSRFトークン、パスワードハッシュ、トークンハッシュの技術実装
- PyMuPDFを使ったPDF抽出実装
- 監査ログ永続化

- 明細の保存/更新、カテゴリの保存/更新、一覧検索クエリ、監査ログ永続化は別々のリポジトリまたはコンポーネントとして分離する。
- 画面設定の保存とユーザーデータ全削除は別々のリポジトリとして分離する。

## presentation

- FastAPIルーター
- リクエスト/レスポンススキーマ
- 認証依存関係
- Swagger/OpenAPI公開
