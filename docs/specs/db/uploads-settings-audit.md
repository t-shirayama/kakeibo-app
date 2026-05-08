# アップロード・設定・監査ログテーブル

## uploads

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

## user_settings

ユーザー設定を表す。

| カラム | 型 | 内容 |
| --- | --- | --- |
| user_id | UUID | ユーザーID |
| currency | string | 通貨 |
| timezone | string | タイムゾーン |
| date_format | string | 日付表示形式 |
| page_size | integer | 1ページあたりの件数 |
| updated_at | datetime | 更新日時 |

## audit_logs

監査ログを表す。

| カラム | 型 | 内容 |
| --- | --- | --- |
| id | UUID | 監査ログID |
| user_id | UUID | 操作ユーザーID |
| action | string | 操作種別 |
| resource_type | string | 対象リソース種別 |
| resource_id | UUID | 対象リソースID |
| details | json | 詳細 |
| created_at | datetime | 作成日時 |
