# PDF取込フォーマット拡張の検討と実装準備

## 状態

未対応

## 優先度

C

## 目的

楽天カード以外のカード会社や明細フォーマットを追加できるように、PDF解析の拡張方針を実装へ落とし込みやすくする。

## 対象

- `docs/specs/pdf-import/README.md`
- `backend/app/infrastructure/parsers/`
- `backend/app/application/importing/`
- `backend/tests/`

## 対応内容

PDFフォーマットごとの抽出ルール分割、抽出できなかった行の確認方法、重複判定やfixture管理の拡張方針を整理し、必要に応じて実装とテストを追加する。

## 完了条件

新しいPDFフォーマットを追加するための実装単位、fixture方針、回帰確認方法が明確になり、必要なコードまたはドキュメントが更新されている。

## 根拠

`docs/specs/pdf-import/README.md` の拡張方針。
