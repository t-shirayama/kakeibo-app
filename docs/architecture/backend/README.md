# バックエンド設計

このファイルはバックエンド設計の入口です。詳細は分割先を参照してください。

## 分割先

- [構成と責務](structure.md): フォルダ構成、ファイル構成、各ファイルの責務
- [レイヤ責務](layers.md): domain / application / bootstrap / infrastructure / presentation の責務
- [実行時前提](runtime.md): API仕様、認証、データベースのバックエンド側前提

## 方針

バックエンドは FastAPI で実装する。

DDDのレイヤ構成を保ち、ドメイン層を技術詳細から分離する。
