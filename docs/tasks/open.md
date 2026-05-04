# 未完了タスク

このファイルは未完了の実装タスクだけを管理します。

完了済みタスクは [完了済みタスク](completed.md) に退避しています。

仕様の正本は `docs/specs/` 配下です。タスク実行中に仕様変更が発生した場合は、関連するSSOT文書を同じ作業内で更新してください。

## 優先度A

- [ ] CSRFトークンをセッションまたはユーザーに紐づけて強化する
  - 目的: CSRFトークンの使い回しやセッション跨ぎ利用の余地を減らし、本番運用時の防御を強める。
  - 対象: `backend/app/application/auth/csrf_service.py`、`backend/app/presentation/api/dependencies.py`、認証周辺の設定/テスト、`docs/specs/security.md`
  - 対応: CSRFトークンをユーザーID、セッションID、またはrefresh token系の識別子と結び付けて検証できるようにする。必要なら認証更新時のCSRF再発行や Origin / Referer チェックも合わせて整理する。
  - 完了条件: 別セッションや別ユーザー相当でのCSRFトークン再利用が拒否され、認証/CSRFのAPIテストで検証される。
  - 根拠: `kakeibo-app-review.md` の優先度A「CSRFトークンがセッション/ユーザーに強く紐づいていない可能性」。

## 優先度B

- [ ] バックエンド依存のlock運用を導入する
  - 目的: 将来の依存解決差分で開発環境やCIが不安定になるリスクを下げる。
  - 対象: `backend/pyproject.toml`、新規lockファイル、CI/README/運用文書
  - 対応: `uv.lock`、`pip-tools`、または同等の方法でバックエンド依存のlock運用を導入し、CIでlock差分や再現性を確認できるようにする。
  - 完了条件: バックエンド依存の再現可能なlockファイルが追加され、更新手順とCI上の確認方法が文書化される。
  - 根拠: `kakeibo-app-review.md` の優先度B「依存バージョンの固定が弱い」。

- [ ] `frontend/src/lib/api.ts` の責務を分割する
  - 目的: 生成クライアントのアダプタ層を保ちつつ、認証再試行、アップロード、ダウンロード、feature別APIを追いやすくする。
  - 対象: `frontend/src/lib/api.ts`、`frontend/src/lib/api/`、必要に応じて `frontend/src/features/*`、`docs/specs/frontend-architecture.md`
  - 対応: transport、auth retry、download、upload、feature別の呼び出し口へ分割し、画面側のimportを段階的に置き換える。
  - 完了条件: `api.ts` の責務が縮小され、主要API呼び出しが分割後の構成で動作する。型チェックと関連E2Eまたは画面テストが通過する。
  - 根拠: `kakeibo-app-review.md` の優先度B「frontend/src/lib/api.ts が少し太り気味」。

- [ ] フロントエンドDockerfileを用途別に分離する
  - 目的: 通常開発・E2E・本番ビルドで必要な依存を分け、イメージの責務と見通しを良くする。
  - 対象: `frontend/Dockerfile`、`docker-compose.yml`、必要に応じてCIやREADME
  - 対応: dev / e2e / prod 相当のDockerfile分割、または同等の責務分離を行い、E2E用のPythonやPlaywright依存を通常フロント用途から切り離す。
  - 完了条件: Dockerfileの用途が明確に分離され、既存の開発起動・E2E・ビルド導線が維持される。関連手順が文書化される。
  - 根拠: `kakeibo-app-review.md` の優先度B「フロントエンドDockerfileが開発/E2E寄りで重い」。

## 優先度C

- [ ] 本番向けCookie設定の確認手順を文書化する
  - 目的: 本番デプロイ時に `COOKIE_SECURE=true` と適切な `SameSite` 設定を取りこぼさないようにする。
  - 対象: `README.md`、`docs/specs/security.md`、必要に応じて運用手順書
  - 対応: 本番環境でのCookie設定値、確認ポイント、ローカルとの差分を明記し、必要なら起動時またはCIでの確認方針も追記する。
  - 完了条件: 本番時のCookie設定要件が文書から一読で分かり、ローカル設定との差分が明確になる。
  - 根拠: `kakeibo-app-review.md` のセキュリティ観点メモ。

- [ ] レポート画面の年月入力UIを `type="month"` ベースへ改善する
  - 目的: 年月入力のバリデーション負荷を減らし、入力ミスを起こしにくくする。
  - 対象: `frontend/src/features/reports/report-dashboard-page.tsx`、関連画面要件とE2E
  - 対応: 現在の `type="text"` + パターン入力を見直し、ブラウザ標準の `type="month"` を軸に扱えるか検証して置き換える。難しい場合は不採用理由を仕様へ残す。
  - 完了条件: レポート画面で年月入力のUXが改善され、要件とテストが現行実装に一致する。
  - 根拠: `kakeibo-app-review.md` の優先度C「フロントの年月入力は type=\"month\" も検討したい」。
