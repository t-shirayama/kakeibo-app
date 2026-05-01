"use client";

import { Edit3, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { EmptyState, LoadingState } from "@/components/state-block";
import { PageHeader } from "@/components/page-header";
import { TransactionEditModal } from "@/components/transaction-edit-modal";
import { api, type TransactionRequest } from "@/lib/api";
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
  const queryClient = useQueryClient();
  const transactionsQuery = useQuery({ queryKey: ["transactions"], queryFn: api.list_transactions });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: api.list_categories });
  const saveMutation = useMutation({
    mutationFn: (request: TransactionRequest) =>
      editingTransaction
        ? api.update_transaction(editingTransaction.transaction_id, request)
        : api.create_transaction(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setIsEditorOpen(false);
      setEditingTransaction(null);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: api.delete_transaction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }),
  });
  const exportMutation = useMutation({ mutationFn: api.export_transactions });

  const transactions = useMemo(() => {
    const rows = transactionsQuery.data ?? [];
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return rows;
    }
    return rows.filter((transaction) =>
      [transaction.shop_name, transaction.category_name ?? "", transaction.memo ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, transactionsQuery.data]);
  const categories = categoriesQuery.data ?? [];
  const categoryById = new Map(categories.map((category) => [category.category_id, category.name]));
  const apiError = transactionsQuery.error || categoriesQuery.error || deleteMutation.error || exportMutation.error;

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
            <button className="button secondary" type="button" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
              {exportMutation.isPending ? "出力中" : "エクスポート"}
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
        {transactionsQuery.isLoading || categoriesQuery.isLoading ? (
          <LoadingState />
        ) : transactions.length === 0 ? (
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
                  <td>{transaction.shop_name}</td>
                  <td>
                    <span className={`badge ${badgeClassByCategory[transaction.category_name ?? ""] ?? "daily"}`}>
                      {transaction.category_name ?? categoryById.get(transaction.category_id) ?? "未分類"}
                    </span>
                  </td>
                  <td className="amount">{formatCurrency(transaction.amount)}</td>
                  <td>{transaction.payment_method ?? "-"}</td>
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
                      <button
                        className="icon-button"
                        type="button"
                        aria-label="明細を削除"
                        onClick={() => {
                          if (window.confirm("この明細を削除しますか？")) {
                            deleteMutation.mutate(transaction.transaction_id);
                          }
                        }}
                      >
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
        error={saveMutation.error}
        isSubmitting={saveMutation.isPending}
        onSubmit={async (request) => {
          await saveMutation.mutateAsync(request);
        }}
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
