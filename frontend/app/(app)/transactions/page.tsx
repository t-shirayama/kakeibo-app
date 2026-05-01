"use client";

import { Edit3, Plus, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { EmptyState, LoadingState } from "@/components/state-block";
import { PageHeader } from "@/components/page-header";
import { TransactionEditModal } from "@/components/transaction-edit-modal";
import { api, type TransactionRequest } from "@/lib/api";
import type { CategoryDto, TransactionDto } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

type PeriodKey = "current_month" | "previous_month" | "current_year";

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionDto | null>(null);
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState<PeriodKey>(() => parsePeriod(searchParams.get("period")));
  const [categoryFilter, setCategoryFilter] = useState(() => searchParams.get("category_id") ?? "");
  const queryClient = useQueryClient();
  const periodRange = useMemo(() => getPeriodRange(period), [period]);
  const transactionsQuery = useQuery({
    queryKey: ["transactions", periodRange, categoryFilter],
    queryFn: () => api.list_transactions({ ...periodRange, category_id: categoryFilter || undefined }),
  });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: () => api.list_categories() });
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
  const categoryById = new Map(categories.map((category) => [category.category_id, category]));
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
            <select
              className="select"
              aria-label="期間"
              value={period}
              onChange={(event) => setPeriod(event.target.value as PeriodKey)}
            >
              <option value="current_month">今月</option>
              <option value="previous_month">先月</option>
              <option value="current_year">今年</option>
            </select>
            <select
              className="select"
              aria-label="カテゴリ絞り込み"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="">すべてのカテゴリ</option>
              {categories.map((category) => (
                <option key={category.category_id} value={category.category_id}>
                  {category.name}
                </option>
              ))}
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
                    <span className="badge" style={getCategoryBadgeStyle(categoryById.get(transaction.category_id))}>
                      {transaction.category_name ?? categoryById.get(transaction.category_id)?.name ?? "未分類"}
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

function parsePeriod(value: string | null): PeriodKey {
  return value === "previous_month" || value === "current_year" ? value : "current_month";
}

function getPeriodRange(period: PeriodKey): { date_from: string; date_to: string } {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  if (period === "previous_month") {
    const previousMonth = new Date(year, month - 1, 1);
    return {
      date_from: formatDateParam(new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1)),
      date_to: formatDateParam(new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0)),
    };
  }

  if (period === "current_year") {
    return {
      date_from: formatDateParam(new Date(year, 0, 1)),
      date_to: formatDateParam(new Date(year, 11, 31)),
    };
  }

  return {
    date_from: formatDateParam(new Date(year, month, 1)),
    date_to: formatDateParam(new Date(year, month + 1, 0)),
  };
}

function formatDateParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCategoryBadgeStyle(category: CategoryDto | undefined): React.CSSProperties {
  const backgroundColor = category?.color ?? "#e2e8f0";
  return {
    backgroundColor,
    borderColor: backgroundColor,
    color: getReadableTextColor(backgroundColor),
  };
}

function getReadableTextColor(hexColor: string): "#17233c" | "#ffffff" {
  const normalized = hexColor.replace("#", "");
  if (!/^[\da-f]{6}$/i.test(normalized)) {
    return "#17233c";
  }

  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.62 ? "#17233c" : "#ffffff";
}
