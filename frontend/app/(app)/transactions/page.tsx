"use client";

import { ArrowDown, ArrowUp, Edit3, Plus, Search, Trash2, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { MessageDialog, type MessageDialogAction } from "@/components/message-dialog";
import { EmptyState, LoadingState } from "@/components/state-block";
import { PageHeader } from "@/components/page-header";
import { TransactionEditModal } from "@/components/transaction-edit-modal";
import { api, type TransactionRequest } from "@/lib/api";
import type { CategoryDto, TransactionDto } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

type DateRange = { date_from?: string; date_to?: string };
type SortField = "date" | "amount";
type SortDirection = "asc" | "desc";
type SaveTransactionInput = {
  request: TransactionRequest;
  updateSameShop: boolean;
};
type MessageDialogState = {
  title: string;
  description: ReactNode;
  actions: MessageDialogAction[];
  tone?: "info" | "danger";
  onAction: (actionId: string) => void;
};

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionDto | null>(null);
  const [isPreparingSave, setIsPreparingSave] = useState(false);
  const [messageDialog, setMessageDialog] = useState<MessageDialogState | null>(null);
  const [query, setQuery] = useState("");
  const initialDateRange = useMemo(() => parseInitialDateRange(searchParams), [searchParams]);
  const [dateFrom, setDateFrom] = useState(initialDateRange.date_from ?? "");
  const [dateTo, setDateTo] = useState(initialDateRange.date_to ?? "");
  const [categoryFilter, setCategoryFilter] = useState(() => searchParams.get("category_id") ?? "");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const queryClient = useQueryClient();
  const periodRange = useMemo(
    () => ({
      keyword: query.trim() || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }),
    [dateFrom, dateTo, query],
  );
  const transactionsQuery = useQuery({
    queryKey: ["transactions", periodRange, categoryFilter],
    queryFn: () => api.list_transactions({ ...periodRange, category_id: categoryFilter || undefined }),
  });
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: () => api.list_categories() });
  const saveMutation = useMutation({
    mutationFn: async ({ request, updateSameShop }: SaveTransactionInput) => {
      if (!editingTransaction) {
        return api.create_transaction(request);
      }

      const transaction = await api.update_transaction(editingTransaction.transaction_id, request);
      if (updateSameShop && request.category_id) {
        await api.update_same_shop_category(editingTransaction.transaction_id, editingTransaction.shop_name, request.category_id);
      }
      return transaction;
    },
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

  const categories = categoriesQuery.data ?? [];
  // カテゴリ名や色を明細表示・検索で再利用するため、IDで引ける形にしておく。
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.category_id, category])),
    [categories],
  );
  const transactions = useMemo(() => {
    const rows = transactionsQuery.data ?? [];
    return [...rows].sort((a, b) => compareTransactions(a, b, sortField, sortDirection));
  }, [sortDirection, sortField, transactionsQuery.data]);
  const searchSuggestions = useMemo(() => {
    const suggestions = new Set<string>();
    for (const transaction of transactionsQuery.data ?? []) {
      suggestions.add(transaction.shop_name);
      suggestions.add(transaction.category_name ?? categoryById.get(transaction.category_id)?.name ?? "未分類");
      if (transaction.memo) {
        suggestions.add(transaction.memo);
      }
    }
    return Array.from(suggestions).filter(Boolean).sort((a, b) => a.localeCompare(b, "ja")).slice(0, 12);
  }, [categoryById, transactionsQuery.data]);
  const activeFilterChips = useMemo(
    () => buildFilterChips({
      dateFrom,
      dateTo,
      categoryName: categoryFilter ? categoryById.get(categoryFilter)?.name : undefined,
      query,
    }),
    [categoryById, categoryFilter, dateFrom, dateTo, query],
  );
  const apiError = transactionsQuery.error || categoriesQuery.error || deleteMutation.error || exportMutation.error;
  const isSaving = saveMutation.isPending || isPreparingSave;
  const hasActiveFilters = Boolean(query.trim() || categoryFilter || dateFrom || dateTo);

  function handleSort(nextField: SortField) {
    if (sortField === nextField) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(nextField);
    setSortDirection(nextField === "date" ? "desc" : "asc");
  }

  function clearFilters() {
    setQuery("");
    setDateFrom("");
    setDateTo("");
    setCategoryFilter("");
  }

  function showMessageDialog(options: Omit<MessageDialogState, "onAction">): Promise<string> {
    return new Promise((resolve) => {
      setMessageDialog({
        ...options,
        onAction: (actionId) => {
          setMessageDialog(null);
          resolve(actionId);
        },
      });
    });
  }

  async function chooseSameShopCategoryUpdate(transaction: TransactionDto, request: TransactionRequest): Promise<"bulk" | "single" | "cancel"> {
    if (request.category_id === transaction.category_id || !request.category_id) {
      return "single";
    }

    const { count } = await api.count_same_shop_transactions(transaction.transaction_id);
    if (count === 0) {
      return "single";
    }

    const action = await showMessageDialog({
      title: "同じ店名の明細を一括更新しますか？",
      description: (
        <p>
          同じ店名「{transaction.shop_name}」の明細が他に{count}件あります。カテゴリを変更する場合は、同じ店名の明細もまとめて更新します。
        </p>
      ),
      actions: [
        { id: "cancel", label: "キャンセル", variant: "secondary" },
        { id: "bulk", label: "一括更新する", variant: "primary" },
      ],
    });
    return action === "bulk" ? "bulk" : "cancel";
  }

  async function handleSubmit(request: TransactionRequest) {
    if (!editingTransaction) {
      await saveMutation.mutateAsync({ request, updateSameShop: false });
      return;
    }

    setIsPreparingSave(true);
    try {
      const updateChoice = await chooseSameShopCategoryUpdate(editingTransaction, request);
      if (updateChoice === "cancel") {
        return;
      }
      await saveMutation.mutateAsync({ request, updateSameShop: updateChoice === "bulk" });
    } finally {
      setIsPreparingSave(false);
    }
  }

  async function handleDelete(transactionId: string) {
    const action = await showMessageDialog({
      title: "この明細を削除しますか？",
      description: <p>削除した明細は一覧に表示されなくなります。</p>,
      tone: "danger",
      actions: [
        { id: "cancel", label: "キャンセル", variant: "secondary" },
        { id: "delete", label: "削除する", variant: "danger" },
      ],
    });
    if (action === "delete") {
      deleteMutation.mutate(transactionId);
    }
  }

  return (
    <>
      <PageHeader
        title="明細一覧"
        subtitle="取り込んだ明細を検索、絞り込み、手動追加できます。"
        actions={
          <div className="toolbar">
            <button
              className="button secondary"
              type="button"
              onClick={() =>
                exportMutation.mutate({
                  keyword: query.trim() || undefined,
                  date_from: dateFrom || undefined,
                  date_to: dateTo || undefined,
                  category_id: categoryFilter || undefined,
                })
              }
              disabled={exportMutation.isPending}
            >
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

      <section className="filter-panel" aria-label="明細フィルタ">
        <div className="filter-grid">
          <div className="filter-field filter-field-search">
            <label htmlFor="transaction-search">検索</label>
            <div className="input-with-icon">
              <Search size={15} aria-hidden="true" />
              <input
                id="transaction-search"
                className="input wide"
                aria-label="明細検索"
                list="transaction-search-suggestions"
                placeholder="店名、メモ、カテゴリで検索"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <datalist id="transaction-search-suggestions">
              {searchSuggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
            <p>検索対象: 店名 / メモ / カテゴリ</p>
          </div>
          <div className="filter-field">
            <label htmlFor="date-from">開始日</label>
            <input id="date-from" className="input wide" aria-label="開始日" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </div>
          <div className="filter-field">
            <label htmlFor="date-to">終了日</label>
            <input id="date-to" className="input wide" aria-label="終了日" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>
          <div className="filter-field">
            <label htmlFor="category-filter">カテゴリ</label>
            <select id="category-filter" className="select wide" aria-label="カテゴリ絞り込み" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="">すべてのカテゴリ</option>
              {categories.map((category) => (
                <option key={category.category_id} value={category.category_id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="filter-summary-row">
          <div className="filter-chips" aria-label="適用中のフィルタ">
            {activeFilterChips.length > 0 ? activeFilterChips.map((chip) => <span className="filter-chip" key={chip}>{chip}</span>) : <span className="filter-chip muted-chip">条件なし</span>}
          </div>
          <button className="button secondary compact" type="button" onClick={clearFilters} disabled={!hasActiveFilters}>
            <X size={14} aria-hidden="true" />
            フィルタ解除
          </button>
        </div>
      </section>

      <div className="result-summary" aria-live="polite">
        {transactions.length}件ヒット
        <span>ソート: {sortLabel(sortField, sortDirection)}</span>
      </div>

      <section className="card table-wrap">
        {transactionsQuery.isLoading || categoriesQuery.isLoading ? (
          <LoadingState />
        ) : transactions.length === 0 ? (
          <EmptyState title="明細がありません" description="検索条件を変更するか、手動で明細を追加してください。" />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <button className="sort-button" type="button" onClick={() => handleSort("date")} aria-label={`取引日でソート ${sortField === "date" ? sortDirectionLabel(sortDirection) : ""}`.trim()}>
                    日付
                    <SortIcon active={sortField === "date"} direction={sortDirection} />
                  </button>
                </th>
                <th>店名</th>
                <th>カテゴリ</th>
                <th className="amount-column">
                  <button className="sort-button amount-sort-button" type="button" onClick={() => handleSort("amount")} aria-label={`取引額でソート ${sortField === "amount" ? sortDirectionLabel(sortDirection) : ""}`.trim()}>
                    金額
                    <SortIcon active={sortField === "amount"} direction={sortDirection} />
                  </button>
                </th>
                <th>支払い方法</th>
                <th>メモ</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.transaction_id} className="transaction-row" tabIndex={0}>
                  <td>{transaction.transaction_date}</td>
                  <td>{transaction.shop_name}</td>
                  <td>
                    <span className="badge" style={getCategoryBadgeStyle(categoryById.get(transaction.category_id))}>
                      {transaction.category_name ?? categoryById.get(transaction.category_id)?.name ?? "未分類"}
                    </span>
                  </td>
                  <td className={`amount amount-column transaction-amount ${transaction.transaction_type}`}>{formatCurrency(transaction.amount)}</td>
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
                        onClick={() => void handleDelete(transaction.transaction_id)}
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
        isSubmitting={isSaving}
        onSubmit={handleSubmit}
        onOpenChange={(open) => {
          setIsEditorOpen(open);
          if (!open) {
            setEditingTransaction(null);
          }
        }}
      />
      {messageDialog ? (
        <MessageDialog
          open
          title={messageDialog.title}
          description={messageDialog.description}
          actions={messageDialog.actions}
          tone={messageDialog.tone}
          onAction={messageDialog.onAction}
          onOpenChange={(open) => {
            if (!open) {
              messageDialog.onAction("cancel");
            }
          }}
        />
      ) : null}
    </>
  );
}

function parseInitialDateRange(searchParams: ReturnType<typeof useSearchParams>): DateRange {
  const dateRange = parseDateRange(searchParams);
  if (dateRange.date_from || dateRange.date_to) {
    return dateRange;
  }
  const period = searchParams.get("period");
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  if (period === "all") {
    return {};
  }
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

function parseDateRange(searchParams: ReturnType<typeof useSearchParams>): DateRange {
  const date_from = searchParams.get("date_from") ?? undefined;
  const date_to = searchParams.get("date_to") ?? undefined;

  if (!isDateParam(date_from) || !isDateParam(date_to)) {
    return {};
  }

  return { date_from, date_to };
}

function isDateParam(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function formatDateParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function compareTransactions(a: TransactionDto, b: TransactionDto, sortField: SortField, sortDirection: SortDirection): number {
  const direction = sortDirection === "asc" ? 1 : -1;
  if (sortField === "amount") {
    const diff = a.amount - b.amount;
    if (diff !== 0) {
      return diff * direction;
    }
  } else {
    const diff = a.transaction_date.localeCompare(b.transaction_date);
    if (diff !== 0) {
      return diff * direction;
    }
  }

  return b.transaction_id.localeCompare(a.transaction_id);
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  const Icon = active && direction === "asc" ? ArrowUp : ArrowDown;

  return <Icon className={`sort-icon${active ? " active" : ""}`} size={13} aria-hidden="true" />;
}

function sortDirectionLabel(direction: SortDirection) {
  return direction === "asc" ? "昇順" : "降順";
}

function sortLabel(field: SortField, direction: SortDirection) {
  return `${field === "date" ? "日付" : "金額"} ${sortDirectionLabel(direction)}`;
}

function buildFilterChips({ dateFrom, dateTo, categoryName, query }: { dateFrom: string; dateTo: string; categoryName?: string; query: string }) {
  const chips: string[] = [];
  if (dateFrom || dateTo) {
    chips.push(formatDateRangeChip(dateFrom, dateTo));
  }
  if (categoryName) {
    chips.push(categoryName);
  }
  if (query.trim()) {
    chips.push(`検索: ${query.trim()}`);
  }
  return chips;
}

function formatDateRangeChip(dateFrom: string, dateTo: string) {
  const currentMonth = getCurrentMonthRange();
  if (dateFrom === currentMonth.date_from && dateTo === currentMonth.date_to) {
    return "今月";
  }
  if (dateFrom && dateTo) {
    return `${dateFrom} - ${dateTo}`;
  }
  return dateFrom ? `${dateFrom}以降` : `${dateTo}まで`;
}

function getCurrentMonthRange() {
  const today = new Date();
  return {
    date_from: formatDateParam(new Date(today.getFullYear(), today.getMonth(), 1)),
    date_to: formatDateParam(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  };
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

  // 背景色の明るさから、バッジ文字が読みやすい色を選ぶ。
  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.62 ? "#17233c" : "#ffffff";
}
