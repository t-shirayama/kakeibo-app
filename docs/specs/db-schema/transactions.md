# 明細・カテゴリテーブル

## categories

カテゴリを表す。

| カラム | 型 | 内容 |
| --- | --- | --- |
| id | UUID | カテゴリID |
| user_id | UUID | ユーザーID |
| name | string | カテゴリ名 |
| color | string | 表示色 |
| description | string | 説明 |
| monthly_budget | integer | 月次予算。未設定時はNULL |
| is_active | boolean | 有効状態 |
| created_at | datetime | 作成日時 |
| updated_at | datetime | 更新日時 |
| deleted_at | datetime | 論理削除日時 |

制約:

- `(user_id, name)` は一意

## transactions

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
