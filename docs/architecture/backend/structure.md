# バックエンド構成と責務

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

## ファイル構成と責務

細分化したファイルは、変更理由が異なる責務を分けるために置く。`__init__.py` は原則として外部公開する型やユースケースの再エクスポートに限定し、業務処理を書かない。

### app 直下

- `main.py`: FastAPIアプリケーション生成、CORS、共通エラーハンドラ、APIルーター登録を担当する。

### bootstrap

- `container.py`: Repository、Storage、Parser、Security実装を組み立て、application層のユースケースへ注入する。
- `income_transactions.py`: 収入設定から期日到来分の収入明細を反映する起動・API呼び出し用の調整処理を置く。

### domain

- `entities.py`: 明細、カテゴリ、アップロードなどのドメインエンティティと状態を置く。
- `value_objects.py`: 金額や日時変換のような値オブジェクトを置く。
- `auth.py`: 認証ドメインで使うリフレッシュトークン概念を置く。
- `repositories.py`: ドメイン層から見たRepository Protocolを置く。
- `initial_categories.py`: 初期カテゴリ生成のドメインルールを置く。

### application 共通

- `common.py`: ページングなど複数機能で使うアプリケーションDTOを置く。
- `transaction_views.py`: 明細と表示用カテゴリ情報を組み合わせた読み取りモデルを置く。
- `report_models.py`: レポート、ダッシュボード、エクスポート条件のアプリケーションDTOを置く。
- `audit_logs.py`: 監査ログ一覧取得ユースケースと、その読み取りProtocolを置く。

### application/auth

- `ports.py`: 認証Repository、JWT、パスワードハッシュ、トークンハッシュなどのProtocolとレコード型を置く。
- `use_cases.py`: ユーザー作成、ログイン、リフレッシュ、ログアウト、パスワードリセットのユースケースを置く。
- `password_policy.py`: パスワード強度の業務ルールを置く。
- `refresh_rotation.py`: リフレッシュトークンローテーションのドメイン寄りの処理を置く。

### application/transactions

- `commands.py`: 明細・カテゴリ操作の入力コマンドを置く。
- `ports.py`: 明細保存、明細検索、カテゴリ、監査ログのProtocolを置く。
- `policies.py`: カテゴリ割り当てや無効カテゴリ扱いの業務判断を置く。
- `use_cases.py`: 明細操作ユースケースとカテゴリ管理ユースケースを置く。両者は同じファイル内でもクラスを分け、変更理由を混ぜない。

### application/category_rules

- `commands.py`: 店名キーワード分類ルールの入力コマンドを置く。
- `ports.py`: 分類ルールRepository Protocolを置く。
- `use_cases.py`: 分類ルールCRUDと、キーワード重複・有効カテゴリ検証を扱う。

### application/importing

- `pdf_importer.py`: PDFカード明細パーサの入力・出力型とParser Protocolを置く。
- `ports.py`: アップロード履歴、監査ログ、原本Storage、取込明細書き込みのProtocolを置く。
- `transaction_writer.py`: PDF取込から見た明細書き込み境界をまとめ、取込ユースケースが明細Repositoryと明細UseCaseを直接握らないようにする。
- `upload_import.py`: PDF保存、解析、重複排除、明細登録、アップロード履歴更新を一つの取込ユースケースとして調整する。

### application/reports と exporting

- `reports/periods.py`: 月次、週次、前月などの期間計算を置く。
- `reports/ports.py`: レポート用明細検索、カテゴリ検索、Workbook出力のProtocolを置く。
- `reports/summaries.py`: 集計計算を置く。
- `reports/use_cases.py`: ダッシュボード、期間別レポート、エクスポート用データ取得のユースケースを置く。
- `exporting/excel_exporter.py`: xlsxファイル構造の低レベル生成処理を置く。
- `exporting/transaction_workbook_exporter.py`: 明細・カテゴリ集計・月別集計をWorkbookシートへ組み立てる処理を置く。

### application/settings と user_data

- `settings/commands.py`: 画面設定更新の入力コマンドを置く。
- `settings/ports.py`: 画面設定Repository Protocolと設定レコードを置く。
- `settings/use_cases.py`: 通貨とタイムゾーンの固定値、表示件数、日付形式、ダークモードなど画面設定だけを扱う。
- `user_data/ports.py`: ユーザーデータ全削除RepositoryとStorageのProtocolを置く。
- `user_data/use_cases.py`: 全データ削除の確認、業務データ論理削除、PDF原本削除を扱う。画面設定更新とは混ぜない。

### application/income_settings

- `commands.py`: 収入設定と月別上書きの入力コマンドを置く。
- `models.py`: 収入設定、月別上書き、収入設定エラーを置く。
- `policies.py`: 対象月計算、支払日補正、収入明細重複判定用ハッシュなどの業務ルールを置く。
- `ports.py`: 収入設定Repository Protocolを置く。
- `use_cases.py`: 収入設定CRUD、月別上書き、期日到来分の収入明細生成を扱う。

### infrastructure

- `config.py`: 環境変数からアプリ設定を読み込む。
- `db/session.py`: SQLAlchemy Engine、Session、FastAPI依存関係用のDBセッションを提供する。
- `parsers/rakuten_card_pdf_parser.py`: PyMuPDFを使った楽天カードPDF明細の具象パーサを置く。
- `storage.py`: PDF原本などのローカルファイル保存・削除の具象実装を置く。

### infrastructure/models

- `base.py`: SQLAlchemy Base、UTC現在時刻、タイムスタンプMixin、論理削除Mixinを置く。
- `user.py`: ユーザーのORMモデルを置く。
- `user_setting.py`: ユーザー画面設定のORMモデルを置く。
- `category.py`: カテゴリのORMモデルを置く。
- `transaction_category_rule.py`: 店名キーワード分類ルールのORMモデルを置く。
- `transaction.py`: 明細のORMモデルを置く。
- `upload.py`: PDFアップロード履歴のORMモデルを置く。
- `audit_log.py`: 監査ログのORMモデルを置く。
- `income_setting.py`: 収入設定と月別上書きのORMモデルを置く。
- `refresh_token.py`: リフレッシュトークンのORMモデルを置く。
- `password_reset_token.py`: パスワードリセットトークンのORMモデルを置く。

### infrastructure/repositories

- `auth.py`: ユーザー、リフレッシュトークン、パスワードリセットトークンの永続化を担当する。
- `settings.py`: 画面設定の保存・取得だけを担当する。
- `user_data.py`: ユーザー配下の明細、カテゴリ、アップロード、収入設定、認証トークンの全削除を担当する。
- `uploads.py`: アップロード履歴の作成、状態更新、一覧取得、論理削除を担当する。
- `audit_log_records.py`: 監査ログの永続化だけを担当する。
- `audit_logs.py`: 監査ログ一覧の読み取りクエリを担当する。
- `transaction_records.py`: 明細集約の保存、更新、論理削除、同一店舗更新、重複判定を担当する。
- `transaction_queries.py`: 明細一覧やレポート向けの読み取りクエリを担当する。
- `transaction_query_filters.py`: 明細検索条件の組み立てを担当する。
- `transaction_query_sorting.py`: 明細検索の並び順組み立てを担当する。
- `transaction_category_display.py`: 無効カテゴリを未分類表示へ寄せるなど、明細表示用カテゴリ解決を担当する。
- `transaction_category_rules.py`: 無効カテゴリ、未分類カテゴリ判定のSQL条件を担当する。
- `category_rules.py`: 店名キーワード分類ルールの保存、更新、削除、取込時の一致候補検索を担当する。
- `categories.py`: カテゴリ集約の保存、更新、無効化、復元を担当する。
- `income_settings.py`: 収入設定と月別上書きの永続化を担当する。
- `mappers.py`: ORMモデルからドメインエンティティへの変換を担当する。
- `transactions.py`: 明細系Repositoryの互換エクスポートだけを置き、業務処理は置かない。

### infrastructure/security

- `jwt_service.py`: PyJWTによるアクセストークン、リフレッシュトークン、パスワードリセットトークンの発行・検証を担当する。
- `csrf_service.py`: CSRFトークンの発行、署名、セッションバインディング検証、有効期限検証を担当する。
- `password_hasher.py`: パスワードハッシュ生成と検証を担当する。
- `token_hasher.py`: リフレッシュトークンやパスワードリセットトークン保存用ハッシュを担当する。

### presentation

- `errors.py`: API共通エラーハンドリングとリクエストID付与を担当する。
- `api/router.py`: APIルーターを集約する。
- `api/dependencies.py`: 認証、CSRF、DBセッションなどFastAPI依存関係を置く。
- `api/cookies.py`: 認証Cookieの設定・削除を担当する。
- `api/routes/*_dtos.py`: 複数ルートで共有するレスポンスDTOと変換処理を置く。

### presentation/api/routes

- `health.py`: ヘルスチェックエンドポイントを置く。
- `auth.py`: CSRF取得、初期管理者作成、ユーザー作成、ログイン、リフレッシュ、ログアウト、パスワードリセットのHTTP入出力を担当する。
- `settings.py`: 画面設定取得・更新、データエクスポート、ユーザーデータ全削除のHTTP入出力を担当する。
- `transactions.py`: 明細一覧、作成、取得、更新、削除、同一店舗カテゴリ更新、明細ExcelエクスポートのHTTP入出力を担当する。
- `transaction_dtos.py`: 明細APIのリクエスト・レスポンスDTOと変換処理を置く。
- `categories.py`: カテゴリ一覧、作成、更新、有効化・無効化、削除のHTTP入出力を担当する。
- `category_rules.py`: 店名キーワード分類ルールの一覧、作成、更新、有効化・無効化、削除のHTTP入出力を担当する。
- `reports.py`: 月次、週次、年次、カテゴリ集計レポートのHTTP入出力を担当する。
- `dashboard.py`: ダッシュボード集計と最近の明細のHTTP入出力を担当する。
- `report_dtos.py`: レポート・ダッシュボード系レスポンスDTOと変換処理を置く。
- `uploads.py`: PDFアップロード履歴の一覧、取得、削除のHTTP入出力を担当する。
- `income_settings.py`: 収入設定と月別上書きのHTTP入出力を担当する。
- `audit_logs.py`: 監査ログ一覧のHTTP入出力を担当する。
