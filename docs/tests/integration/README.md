# 結合テスト

結合テストは、実DBやAPI境界、API mock 前提の画面結合など、単体テストより広い範囲の連携を確認する層です。

## 配置

- Backend Integration Test: `backend/tests/integration/`
- Frontend Integration Test: `frontend/src/test/integration/`

## 実行

```powershell
docker compose run --rm backend python -m pytest -m integration
docker compose run --rm --no-deps frontend npm run test:integration
```

詳細な更新方針は [テスト方針](../../specs/development-workflow/testing.md) を参照してください。
