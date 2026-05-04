"use client";

import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Edit3, Plus, Search, Trash2, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { MessageDialog, type MessageDialogAction } from "@/components/message-dialog";
import { EmptyState, LoadingState } from "@/components/state-block";
import { PageHeader } from "@/components/page-header";
import { categoriesQueryKeys } from "@/features/categories/queryKeys";
import { settingsQueryKeys } from "@/features/settings/queryKeys";
import { transactionsQueryKeys } from "@/features/transactions/queryKeys";
import { TransactionEditModal } from "@/components/transaction-edit-modal";
import { api, type TransactionRequest } from "@/lib/api";
import { getTransactionCategoryDisplay } from "@/lib/transaction-category";
import type { CategoryDto, TransactionDto } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionDto | null>(null);
  const [isPreparingSave, setIsPreparingSave] = useState(false);
  const [messageDialog, setMessageDialog] = useState<MessageDialogState | null>(null);
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: settingsQueryKeys.current(), queryFn: api.get_settings });
  const categoriesQuery = useQuery({ queryKey: categoriesQueryKeys.list(), queryFn: () => api.list_categories() });

  const defaultDateRange = useMemo(() => resolveDefaultDateRange(searchParams), [searchParams]);
  const defaultPageSize = settingsQuery.data?.page_size ?? 10;
  const currentParams = useMemo(
    () => parseSearchParams(searchParams, defaultDateRange, defaultPageSize),
    [defaultDateRange, defaultPageSize, searchParams],
  );
  const currentParamsRef = useRef(currentParams);

  useEffect(() => {
    currentParamsRef.current = currentParams;
  }, [currentParams]);

  useEffect(() => {
    if (settingsQuery.isLoading) {
      return;
    }
    const normalized = buildNormalizedSearchParams(searchParams, defaultDateRange, defaultPageSize);
    if (normalized.toString() === searchParams.toString()) {
      return;
    }
    router.replace(`${pathname}?${normalized.toString()}`, { scroll: false });
  }, [defaultDateRange, defaultPageSize, pathname, router, searchParams, settingsQuery.isLoading]);

  const transactionsQuery = useQuery({
    queryKey: transactionsQueryKeys.list({
      keyword: currentParams.keyword || undefined,
      date_from: currentParams.dateFrom || undefined,
      date_to: currentParams.dateTo || undefined,
      category_id: currentParams.categoryFilter || undefined,
      page: currentParams.page,
      page_size: currentParams.pageSize,
      sort_field: currentParams.sortField,
      sort_direction: currentParams.sortDirection,
    }),
    queryFn: () =>
      api.list_transactions({
        keyword: currentParams.keyword || undefined,
        date_from: currentParams.dateFrom || undefined,
        date_to: currentParams.dateTo || undefined,
        category_id: currentParams.categoryFilter || undefined,
        page: currentParams.page,
        page_size: currentParams.pageSize,
        sort_field: currentParams.sortField,
        sort_direction: currentParams.sortDirection,
      }),
    enabled: !settingsQuery.isLoading,
  });

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
      await queryClient.invalidateQueries({ queryKey: transactionsQueryKeys.all });
      setIsEditorOpen(false);
      setEditingTransaction(null);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: api.delete_transaction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: transactionsQueryKeys.all }),
  });
  const exportMutation = useMutation({ mutationFn: api.export_transactions });

  const categories = categoriesQuery.data ?? [];
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.category_id, category])),
    [categories],
  );
  const transactions = transactionsQuery.data?.items ?? [];
  const total = transactionsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / currentParams.pageSize));
  const searchSuggestions = useMemo(() => {
    const suggestions = new Set<string>();
    for (const transaction of transactions) {
      suggestions.add(transaction.shop_name);
      suggestions.add(getTransactionCategoryDisplay(transaction, categoryById.get(transaction.category_id)).name);
      if (transaction.memo) {
        suggestions.add(transaction.memo);
      }
    }
    return Array.from(suggestions).filter(Boolean).sort((a, b) => a.localeCompare(b, "ja")).slice(0, 12);
  }, [categoryById, transactions]);
  const activeFilterChips = useMemo(
    () =>
      buildFilterChips({
        dateFrom: currentParams.dateFrom,
        dateTo: currentParams.dateTo,
        categoryName: currentParams.categoryFilter ? categoryById.get(currentParams.categoryFilter)?.name : undefined,
        query: currentParams.keyword,
      }),
    [categoryById, currentParams.categoryFilter, currentParams.dateFrom, currentParams.dateTo, currentParams.keyword],
  );
  const apiError = transactionsQuery.error || categoriesQuery.error || settingsQuery.error || deleteMutation.error || exportMutation.error;
  const isSaving = saveMutation.isPending || isPreparingSave;
  const hasActiveFilters = Boolean(
    currentParams.keyword.trim() ||
      currentParams.categoryFilter ||
      currentParams.dateFrom !== defaultDateRange.date_from ||
      currentParams.dateTo !== defaultDateRange.date_to,
  );

  function updateParams(
    updates: Partial<{
      keyword: string;
      dateFrom: string;
      dateTo: string;
      categoryFilter: string;
      page: number;
      pageSize: number;
      sortField: SortField;
      sortDirection: SortDirection;
    }>,
    options: { resetPage?: boolean } = {},
  ) {
    const next = new URLSearchParams(searchParams.toString());
    const resetPage = options.resetPage ?? false;
    const baseParams = currentParamsRef.current;
    const values = {
      keyword: updates.keyword ?? baseParams.keyword,
      dateFrom: updates.dateFrom ?? baseParams.dateFrom,
      dateTo: updates.dateTo ?? baseParams.dateTo,
      categoryFilter: updates.categoryFilter ?? baseParams.categoryFilter,
      page: updates.page ?? (resetPage ? 1 : baseParams.page),
      pageSize: updates.pageSize ?? baseParams.pageSize,
      sortField: updates.sortField ?? baseParams.sortField,
      sortDirection: updates.sortDirection ?? baseParams.sortDirection,
    };
    currentParamsRef.current = values;

    setOrDelete(next, "keyword", values.keyword);
    setOrDelete(next, "date_from", values.dateFrom);
    setOrDelete(next, "date_to", values.dateTo);
    setOrDelete(next, "category_id", values.categoryFilter);
    next.set("page", String(Math.max(1, values.page)));
    next.set("page_size", String(values.pageSize));
    next.set("sort_field", values.sortField);
    next.set("sort_direction", values.sortDirection);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function handleSort(nextField: SortField) {
    if (currentParams.sortField === nextField) {
      updateParams({ sortDirection: currentParams.sortDirection === "asc" ? "desc" : "asc" }, { resetPage: true });
      return;
    }
    updateParams({
      sortField: nextField,
      sortDirection: nextField === "date" ? "desc" : "asc",
    }, { resetPage: true });
  }

  function clearFilters() {
    const next = new URLSearchParams(searchParams.toString());
    currentParamsRef.current = {
      keyword: "",
      dateFrom: defaultDateRange.date_from,
      dateTo: defaultDateRange.date_to,
      categoryFilter: "",
      page: 1,
      pageSize: defaultPageSize,
      sortField: "date",
      sortDirection: "desc",
    };
    next.delete("keyword");
    next.delete("category_id");
    next.set("date_from", defaultDateRange.date_from);
    next.set("date_to", defaultDateRange.date_to);
    next.set("page", "1");
    next.set("page_size", String(defaultPageSize));
    next.set("sort_field", "date");
    next.set("sort_direction", "desc");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
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
                  keyword: currentParams.keyword.trim() || undefined,
                  date_from: currentParams.dateFrom || undefined,
                  date_to: currentParams.dateTo || undefined,
                  category_id: currentParams.categoryFilter || undefined,
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
                value={currentParams.keyword}
                onChange={(event) => updateParams({ keyword: event.target.value }, { resetPage: true })}
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
            <input
              id="date-from"
              className="input wide"
              aria-label="開始日"
              type="date"
              value={currentParams.dateFrom}
              onChange={(event) => updateParams({ dateFrom: event.target.value }, { resetPage: true })}
            />
          </div>
          <div className="filter-field">
            <label htmlFor="date-to">終了日</label>
            <input
              id="date-to"
              className="input wide"
              aria-label="終了日"
              type="date"
              value={currentParams.dateTo}
              onChange={(event) => updateParams({ dateTo: event.target.value }, { resetPage: true })}
            />
          </div>
          <div className="filter-field">
            <label htmlFor="category-filter">カテゴリ</label>
            <select
              id="category-filter"
              className="select wide"
              aria-label="カテゴリ絞り込み"
              value={currentParams.categoryFilter}
              onChange={(event) => updateParams({ categoryFilter: event.target.value }, { resetPage: true })}
            >
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
        {total}件ヒット
        <span>ソート: {sortLabel(currentParams.sortField, currentParams.sortDirection)}</span>
        <span>1ページ {currentParams.pageSize}件</span>
      </div>

      <section className="card table-wrap">
        {transactionsQuery.isLoading || categoriesQuery.isLoading || settingsQuery.isLoading ? (
          <LoadingState />
        ) : transactions.length === 0 ? (
          <EmptyState title="明細がありません" description="検索条件を変更するか、手動で明細を追加してください。" />
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    <button className="sort-button" type="button" onClick={() => handleSort("date")} aria-label={`取引日でソート ${currentParams.sortField === "date" ? sortDirectionLabel(currentParams.sortDirection) : ""}`.trim()}>
                      日付
                      <SortIcon active={currentParams.sortField === "date"} direction={currentParams.sortDirection} />
                    </button>
                  </th>
                  <th>店名</th>
                  <th>カテゴリ</th>
                  <th className="amount-column">
                    <button className="sort-button amount-sort-button" type="button" onClick={() => handleSort("amount")} aria-label={`取引額でソート ${currentParams.sortField === "amount" ? sortDirectionLabel(currentParams.sortDirection) : ""}`.trim()}>
                      金額
                      <SortIcon active={currentParams.sortField === "amount"} direction={currentParams.sortDirection} />
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
                      <span className="badge" style={getCategoryBadgeStyle(getTransactionCategoryDisplay(transaction, categoryById.get(transaction.category_id)).color)}>
                        {getTransactionCategoryDisplay(transaction, categoryById.get(transaction.category_id)).name}
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
            <div className="pagination-bar" aria-label="ページネーション">
              <button className="button secondary compact" type="button" onClick={() => updateParams({ page: currentParams.page - 1 })} disabled={currentParams.page <= 1}>
                <ChevronLeft size={14} aria-hidden="true" />
                前へ
              </button>
              <div className="pagination-pages">
                {buildPageNumbers(currentParams.page, totalPages).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    className={`pagination-page${pageNumber === currentParams.page ? " active" : ""}`}
                    type="button"
                    onClick={() => updateParams({ page: pageNumber })}
                    aria-current={pageNumber === currentParams.page ? "page" : undefined}
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>
              <span className="pagination-summary">
                {currentParams.page} / {totalPages} ページ
              </span>
              <button className="button secondary compact" type="button" onClick={() => updateParams({ page: currentParams.page + 1 })} disabled={currentParams.page >= totalPages}>
                次へ
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>
          </>
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

function parseSearchParams(
  searchParams: ReturnType<typeof useSearchParams>,
  defaultDateRange: { date_from: string; date_to: string },
  defaultPageSize: number,
) {
  const sortField = searchParams.get("sort_field") === "amount" ? "amount" : "date";
  const sortDirection = searchParams.get("sort_direction") === "asc" ? "asc" : "desc";
  const parsedPage = Number(searchParams.get("page") ?? "1");
  const parsedPageSize = Number(searchParams.get("page_size") ?? String(defaultPageSize));
  return {
    keyword: searchParams.get("keyword") ?? "",
    dateFrom: searchParams.get("date_from") ?? defaultDateRange.date_from,
    dateTo: searchParams.get("date_to") ?? defaultDateRange.date_to,
    categoryFilter: searchParams.get("category_id") ?? "",
    page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    pageSize: [10, 20, 50].includes(parsedPageSize) ? parsedPageSize : defaultPageSize,
    sortField: sortField as SortField,
    sortDirection: sortDirection as SortDirection,
  };
}

function buildNormalizedSearchParams(
  searchParams: ReturnType<typeof useSearchParams>,
  defaultDateRange: { date_from: string; date_to: string },
  defaultPageSize: number,
) {
  const normalized = new URLSearchParams(searchParams.toString());
  if (!normalized.get("date_from")) {
    normalized.set("date_from", defaultDateRange.date_from);
  }
  if (!normalized.get("date_to")) {
    normalized.set("date_to", defaultDateRange.date_to);
  }
  if (!normalized.get("page")) {
    normalized.set("page", "1");
  }
  const pageSize = Number(normalized.get("page_size") ?? String(defaultPageSize));
  normalized.set("page_size", String([10, 20, 50].includes(pageSize) ? pageSize : defaultPageSize));
  if (!normalized.get("sort_field") || !["date", "amount"].includes(normalized.get("sort_field") ?? "")) {
    normalized.set("sort_field", "date");
  }
  if (!normalized.get("sort_direction") || !["asc", "desc"].includes(normalized.get("sort_direction") ?? "")) {
    normalized.set("sort_direction", "desc");
  }
  return normalized;
}

function resolveDefaultDateRange(searchParams: ReturnType<typeof useSearchParams>) {
  const explicitFrom = searchParams.get("date_from");
  const explicitTo = searchParams.get("date_to");
  if (isDateParam(explicitFrom) && isDateParam(explicitTo)) {
    return { date_from: explicitFrom, date_to: explicitTo };
  }

  const period = searchParams.get("period");
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  if (period === "all") {
    return { date_from: "", date_to: "" };
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

function setOrDelete(searchParams: URLSearchParams, key: string, value: string) {
  if (!value) {
    searchParams.delete(key);
    return;
  }
  searchParams.set(key, value);
}

function isDateParam(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function formatDateParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function buildPageNumbers(currentPage: number, totalPages: number) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  const pages: number[] = [];
  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }
  return pages;
}

function getCategoryBadgeStyle(backgroundColor: string): React.CSSProperties {
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
