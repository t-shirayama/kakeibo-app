# 単体テスト

単体テストは、ドメインルール、値オブジェクト、ユースケースの分岐、フロントエンドの純粋な表示・変換ロジックを小さく確認する層です。

## 配置

- バックエンド: `backend/tests/unit/`
- フロントエンド: `frontend/src/test/unit/`

## 実行

```powershell
docker compose run --rm --no-deps backend python -m pytest tests/unit
docker compose run --rm --no-deps frontend npm run test:unit
docker compose run --rm --no-deps frontend npm run test:unit:coverage
```

詳細な更新方針は [テスト方針](../../specs/development-workflow/testing.md) を参照してください。
