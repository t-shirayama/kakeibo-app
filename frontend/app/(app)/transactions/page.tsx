"use client";

import { Edit3, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { EmptyState } from "@/components/state-block";
import { PageHeader } from "@/components/page-header";
import { TransactionEditModal } from "@/components/transaction-edit-modal";
import { categories, recentTransactions } from "@/lib/mock-data";
import type { TransactionDto } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

const badgeClassByCategory: Record<string, string> = {
  食費: "food",
  日用品: "daily",
  交通費: "transport",
  娯楽: "entertainment",
};

export default function TransactionsPage() {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionDto | null>(null);
  const [query, setQuery] = useState("");
  const apiError = null;

  const transactions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return recentTransactions;
    }
    return recentTransactions.filter((transaction) =>
      [transaction.merchant_name, transaction.category_name, transaction.memo ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query]);

  return (
    <>
      <PageHeader
        title="明細一覧"
        subtitle="取り込んだ明細を検索、絞り込み、手動追加できます。"
        actions={
          <div className="toolbar">
            <input
              className="input"
              aria-label="明細検索"
              placeholder="店名、メモ、カテゴリで検索"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select className="select" aria-label="期間">
              <option>今月</option>
              <option>先月</option>
              <option>今年</option>
            </select>
            <button className="button secondary" type="button">
              エクスポート
            </button>
            <button
              className="button"
              type="button"
              onClick={() => {
                setEditingTransaction(null);
                setIsEditorOpen(true);
              }}
            >
              <Plus size={15} aria-hidden="true" />
              手動で追加
            </button>
          </div>
        }
      />

      {apiError ? <ApiErrorAlert error={apiError} /> : null}

      <section className="card table-wrap">
        {transactions.length === 0 ? (
          <EmptyState title="明細がありません" description="検索条件を変更するか、手動で明細を追加してください。" />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>日付</th>
                <th>店名</th>
                <th>カテゴリ</th>
                <th>金額</th>
                <th>支払い方法</th>
                <th>メモ</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.transaction_id}>
                  <td>{transaction.transaction_date}</td>
                  <td>{transaction.merchant_name}</td>
                  <td>
                    <span className={`badge ${badgeClassByCategory[transaction.category_name] ?? "daily"}`}>
                      {transaction.category_name}
                    </span>
                  </td>
                  <td className="amount">{formatCurrency(transaction.amount)}</td>
                  <td>{transaction.payment_method}</td>
                  <td>{transaction.memo ?? "-"}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-button"
                        type="button"
                        aria-label="明細を編集"
                        onClick={() => {
                          setEditingTransaction(transaction);
                          setIsEditorOpen(true);
                        }}
                      >
                        <Edit3 size={15} aria-hidden="true" />
                      </button>
                      <button className="icon-button" type="button" aria-label="明細を削除">
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <TransactionEditModal
        categories={categories}
        open={isEditorOpen}
        transaction={editingTransaction}
        onOpenChange={(open) => {
          setIsEditorOpen(open);
          if (!open) {
            setEditingTransaction(null);
          }
        }}
      />
    </>
  );
}
