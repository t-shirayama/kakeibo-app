# 認証系テーブル

## users

ユーザーを表す。

| カラム | 型 | 内容 |
| --- | --- | --- |
| id | UUID | ユーザーID |
| email | string | メールアドレス |
| password_hash | string | パスワードハッシュ |
| is_admin | boolean | 管理者権限 |
| created_at | datetime | 作成日時 |
| updated_at | datetime | 更新日時 |
| deleted_at | datetime | 論理削除日時 |

## refresh_tokens

リフレッシュトークンを表す。

| カラム | 型 | 内容 |
| --- | --- | --- |
| id | UUID | リフレッシュトークンID |
| user_id | UUID | ユーザーID |
| token_hash | string | リフレッシュトークンのハッシュ |
| expires_at | datetime | 有効期限 |
| revoked_at | datetime | 失効日時 |
| replaced_by_token_id | UUID | ローテーション後の置換先トークンID |
| created_at | datetime | 作成日時 |

## password_reset_tokens

パスワードリセットトークンを表す。

| カラム | 型 | 内容 |
| --- | --- | --- |
| id | UUID | パスワードリセットトークンID |
| user_id | UUID | ユーザーID |
| token_hash | string | パスワードリセットトークンのハッシュ |
| expires_at | datetime | 有効期限 |
| used_at | datetime | 使用日時 |
| created_at | datetime | 作成日時 |
