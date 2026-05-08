"use client";

import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Edit3, Plus, Search, Trash2, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { MessageDialog, useMessageDialog } from "@/components/message-dialog";
import { EmptyState, LoadingState } from "@/components/state-block";
import { PageHeader } from "@/components/page-header";
import { categoriesQueryKeys } from "@/features/categories/queryKeys";
import { settingsQueryKeys } from "@/features/settings/queryKeys";
import { transactionsQueryKeys } from "@/features/transactions/queryKeys";
import {
  buildFilterChips,
  buildNormalizedSearchParams,
  buildPageNumbers,
  getCategoryBadgeStyle,
  parseSearchParams,
  resolveDefaultDateRange,
  setOrDelete,
  sortDirectionLabel,
  sortLabel,
  type SortDirection,
  type SortField,
  type TransactionSearchParams,
} from "@/features/transactions/transactions-utils";
import { TransactionEditModal } from "@/features/transactions/components/transaction-edit-modal";
import { api, type TransactionRequest } from "@/lib/api";
import { buildAppRouteUrl } from "@/lib/app-route-url";
import { getTransactionCategoryDisplay } from "@/lib/transaction-category";
import type { CategoryDto, TransactionDto } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

type SaveTransactionInput = {
  request: TransactionRequest;
  updateSameShop: boolean;
};
export default function TransactionsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionDto | null>(null);
  const [isPreparingSave, setIsPreparingSave] = useState(false);
  const { messageDialog, showMessageDialog, handleMessageDialogOpenChange } = useMessageDialog();
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: settingsQueryKeys.current(), queryFn: api.get_settings });
  const categoriesQuery = useQuery({ queryKey: categoriesQueryKeys.list(), queryFn: () => api.list_categories() });

  const defaultDateRange = useMemo(() => resolveDefaultDateRange(searchParams), [searchParams]);
  const defaultPageSize = settingsQuery.data?.page_size ?? 10;
  const currentParams = useMemo(
    () => parseSearchParams(searchParams, defaultDateRange, defaultPageSize),
    [defaultDateRange, defaultPageSize, searchParams],
  );
  const currentParamsRef = useRef<TransactionSearchParams>(currentParams);

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
    router.replace(buildAppRouteUrl(pathname, normalized));
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

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.category_id, category])),
    [categories],
  );
  const transactions = useMemo(() => transactionsQuery.data?.items ?? [], [transactionsQuery.data?.items]);
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

    if ("dateFrom" in updates || "dateTo" in updates) {
      next.delete("period");
    }
    setOrDelete(next, "keyword", values.keyword);
    setOrDelete(next, "date_from", values.dateFrom);
    setOrDelete(next, "date_to", values.dateTo);
    setOrDelete(next, "category_id", values.categoryFilter);
    next.set("page", String(Math.max(1, values.page)));
    next.set("page_size", String(values.pageSize));
    next.set("sort_field", values.sortField);
    next.set("sort_direction", values.sortDirection);
    router.replace(buildAppRouteUrl(pathname, next));
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
      dateFrom: "",
      dateTo: "",
      categoryFilter: "",
      page: 1,
      pageSize: defaultPageSize,
      sortField: "date",
      sortDirection: "desc",
    };
    next.delete("keyword");
    next.delete("category_id");
    next.delete("date_from");
    next.delete("date_to");
    next.set("period", "all");
    next.set("page", "1");
    next.set("page_size", String(defaultPageSize));
    next.set("sort_field", "date");
    next.set("sort_direction", "desc");
    router.replace(buildAppRouteUrl(pathname, next));
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
    <div className="transactions-page">
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
          <button className="button secondary compact" type="button" onClick={clearFilters}>
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

      <section className="card transactions-table-panel">
        {transactionsQuery.isLoading || categoriesQuery.isLoading || settingsQuery.isLoading ? (
          <LoadingState />
        ) : transactions.length === 0 ? (
          <EmptyState title="明細がありません" description="検索条件を変更するか、手動で明細を追加してください。" />
        ) : (
          <>
            <div className="table-wrap transactions-table-wrap">
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
            </div>
            <div className="pagination-bar transactions-pagination-bar" aria-label="ページネーション">
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
          onOpenChange={handleMessageDialogOpenChange}
        />
      ) : null}
    </div>
  );
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  const Icon = active && direction === "asc" ? ArrowUp : ArrowDown;

  return <Icon className={`sort-icon${active ? " active" : ""}`} size={13} aria-hidden="true" />;
}
