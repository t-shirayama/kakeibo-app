"use client";

import { Edit3, Plus, Trash2 } from "lucide-react";
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

type PeriodKey = "current_month" | "previous_month" | "current_year" | "all";
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
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return rows;
    }
    return rows.filter((transaction) =>
      // APIのカテゴリ名が未設定でも、カテゴリ一覧から補完して検索対象に含める。
      [
        transaction.shop_name,
        transaction.category_name ?? categoryById.get(transaction.category_id)?.name ?? "未分類",
        transaction.memo ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [categoryById, query, transactionsQuery.data]);
  const apiError = transactionsQuery.error || categoriesQuery.error || deleteMutation.error || exportMutation.error;
  const isSaving = saveMutation.isPending || isPreparingSave;

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
              <option value="all">全期間</option>
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

function parsePeriod(value: string | null): PeriodKey {
  return value === "previous_month" || value === "current_year" || value === "all" ? value : "current_month";
}

function getPeriodRange(period: PeriodKey): { date_from?: string; date_to?: string } {
  if (period === "all") {
    return {};
  }

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

  // 背景色の明るさから、バッジ文字が読みやすい色を選ぶ。
  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.62 ? "#17233c" : "#ffffff";
}
