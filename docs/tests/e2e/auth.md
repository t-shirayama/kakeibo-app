# 認証E2Eシナリオ

## 対応テストファイル

- `frontend/e2e/auth.setup.ts`
- `frontend/e2e/auth.spec.ts`

## 目的

ログインと保護画面の未認証リダイレクトを確認する。

## 前提データ

- サンプルユーザー: `sample@example.com` / `SamplePassw0rd!`
- E2E実行前にサンプルユーザーがE2E専用DBへ投入されている。
- 通常画面テスト用の認証状態は `e2e/.auth/sample-user.json` に保存する。

## 操作手順

- `auth.setup.ts`
  - `/login` を開く。
  - メールアドレスとパスワードを入力する。
  - ログインボタンを押す。
  - ダッシュボード表示後、storage stateを保存する。
- `auth.spec.ts`
  - 未認証コンテキストで `/dashboard` を開く。
  - 未認証コンテキストで `/login` からログインする。

## 期待結果

- 未認証で `/dashboard`、`/income-settings`、`/reports`、`/category-rules` を開くと、それぞれ `/login?redirect=...` に遷移する。
- サンプルユーザーでログインすると `/dashboard` に遷移し、ダッシュボード見出しが表示される。

## 安定化メモ

- 認証状態はsetup projectで1回だけ作成し、通常specから共有する。
- 未認証テストは空のstorage stateを持つ新規ブラウザコンテキストで実行する。
- `navigation.ts` の redirect helper を使い、未ログイン時の URL とログイン見出しを同じ待ち方で確認する。
- CSRF session不足の403再試行と、401後にrefreshも失敗した場合のログイン誘導は Frontend Integration Test で確認する。
