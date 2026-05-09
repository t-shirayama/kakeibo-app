# テスト拡充順の実行とテスト資産整理

## 状態

未対応

## 優先度

C

## 目的

テスト層ごとの責務に沿って未カバー観点を減らし、重複 fixture や helper を整理して保守しやすくする。

## 対象

- `backend/tests/unit/`
- `backend/tests/integration/`
- `frontend/src/test/unit/`
- `frontend/src/test/integration/`
- `frontend/e2e/`
- `docs/specs/development-workflow/testing.md`

## 対応内容

Unit Test の未カバー純粋ロジック、Backend / Frontend Integration Test の共通 fixture、認証境界、E2E helper、カテゴリ管理・PDF取込・明細フォーム・CSRF再試行・Excel出力・migration 検証の順に、必要なテストと helper 整理を進める。

## 完了条件

追加・整理したテストが Docker Compose の標準コマンドで実行でき、重複していた準備処理や helper 方針が関連ドキュメントに反映されている。

## 根拠

`docs/specs/development-workflow/testing.md` のテスト棚卸しと拡充順。
