## 概要

- このPRで何を変更したか
- 背景や目的

## 変更内容

- 

## 確認項目

- [ ] ローカルで動作確認した
- [ ] 影響するテストを更新した、または既存テストでカバーできることを確認した
- [ ] 仕様、要件、設計、E2E、運用ドキュメントの更新要否を確認した
- [ ] `docs/tasks/open.md` / `docs/tasks/completed.md` の状態を必要に応じて更新した

## 実行した確認

- [ ] `docker compose run --rm --no-deps frontend npm run lint`
- [ ] `docker compose run --rm --no-deps frontend npm run typecheck`
- [ ] `docker compose run --rm --no-deps frontend npm run build`
- [ ] `docker compose run --rm backend python -m alembic upgrade head`
- [ ] `docker compose run --rm backend python -m pytest`
- [ ] `docker compose run --rm e2e`
- [ ] `docker compose run --rm --no-deps secret-scan git /repo --no-banner --redact`

## 確認結果メモ

- 実行したコマンド
- 未実行のものがあれば理由
- スクリーンショットや補足

## レビューで見てほしい点

- 
