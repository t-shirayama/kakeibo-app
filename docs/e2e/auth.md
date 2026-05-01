# 認証E2Eシナリオ

## 対応テストファイル

- `frontend/e2e/auth.setup.ts`
- `frontend/e2e/auth.spec.ts`

## 目的

ログイン、保護画面の未認証リダイレクト、認証済みAPIが401になった場合のログイン誘導を確認する。

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
  - 認証済み状態でダッシュボードAPIとrefresh APIを401にモックする。

## 期待結果

- 未認証で保護画面を開くと `/login?redirect=%2Fdashboard` に遷移する。
- サンプルユーザーでログインすると `/dashboard` に遷移し、ダッシュボード見出しが表示される。
- 認証済みAPIとrefreshが401の場合、ログイン画面に戻る。

## 安定化メモ

- 認証状態はsetup projectで1回だけ作成し、通常specから共有する。
- 未認証テストは空のstorage stateを持つ新規ブラウザコンテキストで実行する。
- 401テストはAPI routeをモックし、実際のトークン期限に依存しない。
