# 収入設定テーブル

## income_settings

毎月の収入設定を表す。

| カラム | 型 | 内容 |
| --- | --- | --- |
| id | UUID | 収入設定ID |
| user_id | UUID | ユーザーID |
| member_name | string | 対象者名 |
| category_id | UUID | 収入カテゴリID |
| base_amount | integer | 毎月の基本金額 |
| base_day | integer | 毎月の基本発生日 |
| start_month | date | 登録開始月の1日 |
| end_month | date | 登録終了月の1日。未設定時はNULL |
| created_at | datetime | 作成日時 |
| updated_at | datetime | 更新日時 |
| deleted_at | datetime | 論理削除日時 |

## income_setting_overrides

収入設定の月別変更を表す。

| カラム | 型 | 内容 |
| --- | --- | --- |
| id | UUID | 月別変更ID |
| user_id | UUID | ユーザーID |
| income_setting_id | UUID | 収入設定ID |
| target_month | date | 対象月の1日 |
| amount | integer | 対象月の金額 |
| day | integer | 対象月の発生日 |
| created_at | datetime | 作成日時 |
| updated_at | datetime | 更新日時 |

制約:

- `(income_setting_id, target_month)` は一意
