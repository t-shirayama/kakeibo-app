# DBスキーマ

## 方針

データベースは MySQL 8.4 を使う。スキーマはドメインモデルを永続化するための案として管理する。

ORMは SQLAlchemy、マイグレーションは Alembic を使う。

ドメイン層はデータベーススキーマやORMに依存しない。永続化形式への変換はインフラ層で行う。

金額は整数JPYとして保存し、マイナス金額は取消明細を表す。0円明細を許可する。日時はDBにUTCで保存し、表示時に `Asia/Tokyo` へ変換する。

UUIDはMySQL上では `CHAR(36)` として保存する。

ユーザー削除時はユーザーと関連データを論理削除し、保存済みPDF原本はストレージから削除する。

## テーブル案

### users

ユーザーを表す。

| カラム | 型 | 内容 |
| --- | --- | --- |
| id | UUID | ユーザーID |
| email | string | メールアドレス |
| password_hash | string | パスワードハッシュ |
| created_at | datetime | 作成日時 |
| updated_at | datetime | 更新日時 |
| deleted_at | datetime | 論理削除日時 |

### refresh_tokens

リフレッシュトークンを表す。

| カラム | 型 | 内容 |
| --- | --- | --- |
| id | UUID | リフレッシュトークンID |
| user_id | UUID | ユーザーID |
| token_hash | string | リフレッシュトークンのハッシュ |
| expires_at | datetime | 有効期限 |
| revoked_at | datetime | 失効日時 |
| created_at | datetime | 作成日時 |

### categories

カテゴリを表す。

| カラム | 型 | 内容 |
| --- | --- | --- |
| id | UUID | カテゴリID |
| user_id | UUID | ユーザーID |
| name | string | カテゴリ名 |
| color | string | 表示色 |
| description | string | 説明 |
| is_active | boolean | 有効状態 |
| created_at | datetime | 作成日時 |
| updated_at | datetime | 更新日時 |
| deleted_at | datetime | 論理削除日時 |

制約:

- `(user_id, name)` は一意

### transactions

明細を表す。

| カラム | 型 | 内容 |
| --- | --- | --- |
| id | UUID | 明細ID |
| user_id | UUID | ユーザーID |
| category_id | UUID | カテゴリID |
| transaction_date | date | 日付 |
| shop_name | string | 店名 |
| card_user_name | string | 楽天カード明細の利用者 |
| amount | integer | 金額 |
| transaction_type | string | 支出または収入 |
| payment_method | string | 支払い方法 |
| memo | string | メモ |
| source_upload_id | UUID | 取込元アップロードID |
| source_file_name | string | 抽出元ファイル名 |
| source_row_number | integer | 抽出元行番号 |
| source_page_number | integer | 抽出元ページ番号 |
| source_format | string | 抽出元フォーマット |
| source_hash | string | 重複判定用ハッシュ |
| created_at | datetime | 作成日時 |
| updated_at | datetime | 更新日時 |
| deleted_at | datetime | 論理削除日時 |

### uploads

PDFアップロード履歴を表す。

| カラム | 型 | 内容 |
| --- | --- | --- |
| id | UUID | アップロードID |
| user_id | UUID | ユーザーID |
| file_name | string | ファイル名 |
| stored_file_path | string | 保存済みPDF原本のパス |
| status | string | 処理中、完了、失敗 |
| imported_count | integer | 取込件数 |
| error_message | string | エラー理由 |
| uploaded_at | datetime | アップロード日時 |
| deleted_at | datetime | 論理削除日時 |

### user_settings

ユーザー設定を表す。

| カラム | 型 | 内容 |
| --- | --- | --- |
| user_id | UUID | ユーザーID |
| currency | string | 通貨 |
| timezone | string | タイムゾーン |
| date_format | string | 日付表示形式 |
| page_size | integer | 1ページあたりの件数 |
| dark_mode | boolean | ダークモード |
| updated_at | datetime | 更新日時 |
