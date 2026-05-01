# DBスキーマ

## 方針

データベースは未決定。スキーマはドメインモデルを永続化するための案として管理する。

ドメイン層はデータベーススキーマやORMに依存しない。永続化形式への変換はインフラ層で行う。

## テーブル案

### users

ユーザーを表す。

| カラム | 型 | 内容 |
| --- | --- | --- |
| id | UUID | ユーザーID |
| email | string | メールアドレス |
| created_at | datetime | 作成日時 |
| updated_at | datetime | 更新日時 |

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
| amount | integer | 金額 |
| transaction_type | string | 支出または収入 |
| payment_method | string | 支払い方法 |
| memo | string | メモ |
| source_upload_id | UUID | 取込元アップロードID |
| created_at | datetime | 作成日時 |
| updated_at | datetime | 更新日時 |

### uploads

PDFアップロード履歴を表す。

| カラム | 型 | 内容 |
| --- | --- | --- |
| id | UUID | アップロードID |
| user_id | UUID | ユーザーID |
| file_name | string | ファイル名 |
| status | string | 処理中、完了、失敗 |
| imported_count | integer | 取込件数 |
| error_message | string | エラー理由 |
| uploaded_at | datetime | アップロード日時 |

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

## 確認事項

- 採用するDBをどうするか。
- 金額を整数で持つ方針でよいか。
- アップロード元ファイルの保存先をDB外にするか。
