# APIエンドポイント

## ダッシュボード

- `GET /api/dashboard/summary`
  - 対象月の支出合計、収入合計、収支、取引件数、前月比、直近6ヶ月の月別収入・支出推移を返す。
  - あわせて、設定済みカテゴリ予算の合計、当月支出実績、残額、進捗率、超過状態、カテゴリ別予算進捗も返す。
  - 対象月は任意の `year` と `month` クエリで指定できる。未指定時は当月を対象にする。
- `GET /api/dashboard/recent-transactions`
  - 最近の明細を日付降順で返す。

## 明細

- `GET /api/transactions`
  - 明細一覧を検索、期間、カテゴリ、ページ指定で取得する。
  - `keyword` は店名、メモ、カテゴリ名を対象に検索し、`未分類` 指定時は未分類表示対象の明細も含める。
  - 期間指定には `date_from` と `date_to` を `YYYY-MM-DD` 形式で指定する。
  - `sort_field` は `date` または `amount`、`sort_direction` は `asc` または `desc` を受け付ける。初期値は `date` / `desc` とする。
  - `page_size` の既定値は10件とする。
  - 未分類カテゴリで絞り込む場合は、未分類カテゴリに紐づく明細に加え、無効化または論理削除されたカテゴリに紐づく明細も返す。
  - 一覧レスポンスには `category_name`、`category_color`、`display_category_id` を含め、無効化または論理削除されたカテゴリは表示上 `未分類` として正規化して返す。
- `POST /api/transactions`
  - 明細を手動登録する。
- `GET /api/transactions/{transaction_id}`
  - 明細詳細を取得する。
- `GET /api/transactions/{transaction_id}/same-shop-count`
  - 編集対象と同じ店名を持つ他の明細件数を取得する。
- `PUT /api/transactions/{transaction_id}`
  - 明細を更新する。
- `PATCH /api/transactions/{transaction_id}/same-shop-category`
  - 指定した店名を持つ他の明細カテゴリを一括更新する。
  - リクエストは `shop_name` と `category_id` を指定する。
- `DELETE /api/transactions/{transaction_id}`
  - 明細を削除する。
- `GET /api/transactions/export`
  - 明細一覧、カテゴリ集計、月別集計を含むExcel（`.xlsx`）をエクスポートする。
  - `keyword`、`category_id`、`date_from`、`date_to` を指定した場合は、明細一覧の現在の検索結果に一致するデータだけを出力する。

## カテゴリ

- `GET /api/categories`
  - カテゴリ一覧を取得する。
  - `include_inactive=true` 指定時は無効カテゴリも取得する。
- `POST /api/categories`
  - カテゴリを追加する。
  - `monthly_budget` に月次予算を指定できる。未設定の場合は `null` とする。
- `PUT /api/categories/{category_id}`
  - カテゴリを更新する。
  - カテゴリ名、色、説明に加えて `monthly_budget` を更新できる。
- `PATCH /api/categories/{category_id}/status`
  - カテゴリの有効/無効を切り替える。
- `DELETE /api/categories/{category_id}`
  - カテゴリを論理削除する。

## 分類ルール

- `GET /api/category-rules`
  - 店名キーワードによるカテゴリ分類ルール一覧を取得する。
  - `include_inactive=true` 指定時は無効ルールも取得する。
- `POST /api/category-rules`
  - 店名キーワードとカテゴリを指定して分類ルールを追加する。
- `PUT /api/category-rules/{rule_id}`
  - 店名キーワードまたは分類先カテゴリを更新する。
- `PATCH /api/category-rules/{rule_id}/status`
  - 分類ルールの有効/無効を切り替える。
- `DELETE /api/category-rules/{rule_id}`
  - 分類ルールを論理削除する。

## 収入設定

- `GET /api/income-settings`
  - 収入設定一覧を取得する。
  - 登録期間内で発生日を迎えた過去月を含む収入明細を、重複しないよう自動追加する。
- `POST /api/income-settings`
  - 対象者名、カテゴリ、毎月の金額、毎月の発生日、登録開始月、登録終了月を指定して収入設定を追加する。
- `PUT /api/income-settings/{income_setting_id}`
  - 収入設定の対象者名、カテゴリ、毎月の金額、毎月の発生日、登録開始月、登録終了月を更新する。
- `DELETE /api/income-settings/{income_setting_id}`
  - 収入設定を論理削除する。
- `PUT /api/income-settings/{income_setting_id}/overrides/{target_month}`
  - `target_month` は `YYYY-MM` 形式で指定し、対象月だけ金額と発生日を上書きする。
- `DELETE /api/income-settings/{income_setting_id}/overrides/{target_month}`
  - 対象月の月別変更を削除する。

## アップロード

- `POST /api/uploads`
  - PDFファイルをアップロードする。
- `GET /api/uploads`
  - アップロード履歴を取得する。
- `GET /api/uploads/{upload_id}`
  - アップロード結果を取得する。
- `DELETE /api/uploads/{upload_id}`
  - アップロード履歴を論理削除し、保存済みPDF原本をストレージから即削除する。

## 監査ログ

- `GET /api/audit-logs`
  - 監査ログ一覧を取得する。
  - `page`、`page_size`、`action`、`resource_type`、`date_from`、`date_to` で絞り込める。
  - ログインユーザー本人の監査ログだけを返す。

## レポート

- `GET /api/reports/monthly`
  - 月別支出推移を取得する。
- `GET /api/reports/weekly`
  - 週別支出レポートを取得する。
- `GET /api/reports/yearly`
  - 年別支出レポートを取得する。
- `GET /api/reports/categories`
  - カテゴリ別支出割合と推移を取得する。

## 設定

- `GET /api/settings`
  - ユーザー設定を取得する。
- `PUT /api/settings`
  - ユーザー設定を更新する。`page_size` は10、20、50のいずれかとし、通貨はJPY固定で扱う。
- `POST /api/settings/export`
  - 明細一覧、カテゴリ集計、月別集計を含むExcel（`.xlsx`）をエクスポートする。
- `DELETE /api/settings/data`
  - ユーザーデータを削除する。確認文字列 `DELETE` またはパスワード再入力を必須とし、削除後に認証Cookieを削除する。
