"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, CreditCard, Plus, ReceiptText, Wallet } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { LoadingState } from "@/components/state-block";
import { PageHeader } from "@/components/page-header";
import {
  addMonths,
  buildCalendarDayAriaLabel,
  buildCalendarDays,
  buildMonthlySummary,
  formatCalendarDayMeta,
  formatDateLabel,
  formatYearMonthLabel,
  getCalendarDayToneClassName,
  getCalendarWeekdayClassName,
  getCurrentYearMonth,
  getDefaultSelectedDate,
  getMonthDateRange,
  getTodayDateString,
  isDateInYearMonth,
  normalizeYearMonth,
} from "@/features/calendar/calendar-utils";
import { calendarQueryKeys } from "@/features/calendar/queryKeys";
import { categoriesQueryKeys } from "@/features/categories/queryKeys";
import { TransactionEditModal } from "@/features/transactions/components/transaction-edit-modal";
import { api } from "@/lib/api";
import { buildAppRouteUrl } from "@/lib/app-route-url";
import { formatCurrency } from "@/lib/format";
import { getTransactionCategoryDisplay } from "@/lib/transaction-category";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export function CalendarPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const selectedYearMonth = normalizeYearMonth(searchParams.get("month")) ?? getCurrentYearMonth();
  const [selectedDate, setSelectedDate] = useState(getTodayDateString);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const range = useMemo(() => getMonthDateRange(selectedYearMonth), [selectedYearMonth]);
  const categoriesQuery = useQuery({ queryKey: categoriesQueryKeys.list(), queryFn: () => api.list_categories() });
  const transactionsQuery = useQuery({
    queryKey: calendarQueryKeys.transactions(range.date_from, range.date_to),
    queryFn: () => api.list_all_transactions(range),
  });
  const saveMutation = useMutation({
    mutationFn: api.create_transaction,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: calendarQueryKeys.all });
      setIsEditorOpen(false);
    },
  });

  const transactions = useMemo(() => transactionsQuery.data ?? [], [transactionsQuery.data]);
  const categories = categoriesQuery.data ?? [];
  const calendarDays = useMemo(() => buildCalendarDays(selectedYearMonth, transactions), [selectedYearMonth, transactions]);
  const monthlySummary = useMemo(() => buildMonthlySummary(transactions), [transactions]);
  const effectiveSelectedDate = useMemo(
    () => (isDateInYearMonth(selectedDate, selectedYearMonth) ? selectedDate : getDefaultSelectedDate(selectedYearMonth, transactions)),
    [selectedDate, selectedYearMonth, transactions],
  );
  const selectedDaySummary = useMemo(
    () => calendarDays.find((day) => day.date === effectiveSelectedDate) ?? calendarDays.find((day) => day.date.startsWith(selectedYearMonth)) ?? null,
    [calendarDays, effectiveSelectedDate, selectedYearMonth],
  );
  const selectedDayTransactions = useMemo(
    () =>
      [...transactions]
        .filter((transaction) => transaction.transaction_date === selectedDaySummary?.date)
        .sort((a, b) => {
          if (a.transaction_type !== b.transaction_type) {
            return a.transaction_type === "expense" ? -1 : 1;
          }
          return b.amount - a.amount;
        }),
    [selectedDaySummary?.date, transactions],
  );

  useEffect(() => {
    if (normalizeYearMonth(searchParams.get("month"))) {
      return;
    }
    const next = new URLSearchParams(searchParams.toString());
    next.set("month", selectedYearMonth);
    router.replace(buildAppRouteUrl(pathname, next));
  }, [pathname, router, searchParams, selectedYearMonth]);

  function updateSelectedYearMonth(nextValue: string) {
    const normalized = normalizeYearMonth(nextValue) ?? getCurrentYearMonth();
    setSelectedDate(getDefaultSelectedDate(normalized, transactions));
    const next = new URLSearchParams(searchParams.toString());
    next.set("month", normalized);
    router.replace(buildAppRouteUrl(pathname, next));
  }

  function openTransactions(dateFrom: string, dateTo: string) {
    const next = new URLSearchParams({
      date_from: dateFrom,
      date_to: dateTo,
    });
    window.location.assign(`/transactions?${next.toString()}`);
  }

  async function handleCreateTransaction(request: Parameters<typeof api.create_transaction>[0]) {
    await saveMutation.mutateAsync(request);
  }

  return (
    <div className="calendar-page">
      <PageHeader
        title="カレンダー"
        subtitle="月ごとの支出の波を日別に確認し、気になる日はそのまま明細へ掘り下げられます。"
        actions={
          <div className="toolbar report-toolbar">
            <div className="month-switcher" aria-label="対象月の切り替え">
              <button className="icon-button" type="button" aria-label="前月" onClick={() => updateSelectedYearMonth(addMonths(selectedYearMonth, -1))}>
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <label className="month-input-label">
                <span className="sr-only">表示月</span>
                <input aria-label="表示月" className="input month-input" type="month" min="1900-01" max="9999-12" value={selectedYearMonth} onChange={(event) => updateSelectedYearMonth(event.target.value || getCurrentYearMonth())} />
              </label>
              <button className="icon-button" type="button" aria-label="翌月" onClick={() => updateSelectedYearMonth(addMonths(selectedYearMonth, 1))}>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        }
      />

      {transactionsQuery.error || categoriesQuery.error ? <ApiErrorAlert error={transactionsQuery.error || categoriesQuery.error} /> : null}

      {transactionsQuery.isLoading || categoriesQuery.isLoading ? (
        <section className="card panel">
          <LoadingState />
        </section>
      ) : (
        <div className="calendar-layout">
          <section className="card panel calendar-board-panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">日別の支出カレンダー</h2>
                <p className="panel-caption">{formatYearMonthLabel(selectedYearMonth)}の支出合計を日ごとに表示します</p>
              </div>
              <button className="text-link-button" type="button" onClick={() => openTransactions(range.date_from, range.date_to)}>
                この月の明細一覧へ
              </button>
            </div>

            <div className="calendar-weekdays" aria-hidden="true">
              {WEEKDAY_LABELS.map((label, index) => (
                <span key={label} className={getCalendarWeekdayClassName(index)}>
                  {label}
                </span>
              ))}
            </div>

            <div className="calendar-grid" role="grid" aria-label={`${formatYearMonthLabel(selectedYearMonth)}の支出カレンダー`}>
              {calendarDays.map((day) =>
                day.date.startsWith(selectedYearMonth) ? (
                  <button
                    key={day.date}
                    className={`calendar-day${day.date === selectedDaySummary?.date ? " selected" : ""}${day.expense_total > 0 ? " has-expense" : ""}${day.income_total > 0 ? " has-income" : ""}${getCalendarDayToneClassName(day)}`}
                    type="button"
                    role="gridcell"
                    aria-label={buildCalendarDayAriaLabel(day)}
                    onClick={() => setSelectedDate(day.date)}
                  >
                    <span className="calendar-day-number">{day.day}</span>
                    {day.expense_total > 0 ? (
                      <>
                        <span className="calendar-day-expense-label">支出</span>
                        <strong className="calendar-day-expense">{formatCurrency(day.expense_total)}</strong>
                      </>
                    ) : null}
                    <span className="calendar-day-meta">{formatCalendarDayMeta(day)}</span>
                  </button>
                ) : (
                  <div key={day.date} className={`calendar-day placeholder${getCalendarDayToneClassName(day)}`} aria-hidden="true" />
                ),
              )}
            </div>
          </section>

          <aside className="calendar-sidebar">
            <section className="card panel calendar-month-summary-panel">
              <h2 className="panel-title">月間サマリー</h2>
              <div className="calendar-summary-grid" aria-label="月間サマリー">
                <SummaryTile icon={<Wallet size={16} aria-hidden="true" />} label="収入" value={formatCurrency(monthlySummary.total_income)} tone="income" />
                <SummaryTile icon={<CreditCard size={16} aria-hidden="true" />} label="支出" value={formatCurrency(monthlySummary.total_expense)} tone="expense" />
                <SummaryTile icon={<ReceiptText size={16} aria-hidden="true" />} label="収支" value={formatCurrency(monthlySummary.balance)} tone="balance" />
              </div>
            </section>

            <section className="card panel calendar-selected-day-panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">選択日の明細</h2>
                  <p className="panel-caption">{selectedDaySummary ? formatDateLabel(selectedDaySummary.date) : "日付を選択してください"}</p>
                </div>
                {selectedDaySummary ? (
                  <div className="row-actions">
                    <button
                      className="button compact"
                      type="button"
                      onClick={() => setIsEditorOpen(true)}
                      disabled={categories.length === 0 || saveMutation.isPending}
                    >
                      <Plus size={14} aria-hidden="true" />
                      明細追加
                    </button>
                    <button className="text-link-button" type="button" onClick={() => openTransactions(selectedDaySummary.date, selectedDaySummary.date)}>
                      明細一覧で確認
                    </button>
                  </div>
                ) : null}
              </div>

              {selectedDaySummary ? (
                <>
                  <div className="calendar-selected-day-summary">
                    <SummaryInline label="支出" value={formatCurrency(selectedDaySummary.expense_total)} />
                    <SummaryInline label="収入" value={formatCurrency(selectedDaySummary.income_total)} />
                    <SummaryInline label="件数" value={`${selectedDaySummary.transaction_count}件`} />
                  </div>
                  {selectedDayTransactions.length > 0 ? (
                    <div className="calendar-transaction-list" aria-label="選択日の明細一覧">
                      {selectedDayTransactions.map((transaction) => (
                        <div className="calendar-transaction-row" key={transaction.transaction_id}>
                          <div>
                            <strong>{transaction.shop_name}</strong>
                            <p>{getTransactionCategoryDisplay(transaction).name}{transaction.memo ? ` / ${transaction.memo}` : ""}</p>
                          </div>
                          <span className={`amount transaction-amount ${transaction.transaction_type}`}>{formatCurrency(transaction.amount)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="calendar-panel-empty">この日の明細はありません。</p>
                  )}
                </>
              ) : (
                <p className="calendar-panel-empty">この月の日付を選ぶと明細を確認できます。</p>
              )}
            </section>
          </aside>
        </div>
      )}

      <TransactionEditModal
        categories={categories}
        initialTransactionDate={selectedDaySummary?.date}
        open={isEditorOpen}
        transaction={null}
        error={saveMutation.error}
        isSubmitting={saveMutation.isPending}
        onSubmit={handleCreateTransaction}
        onOpenChange={setIsEditorOpen}
      />
    </div>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "income" | "expense" | "balance";
}) {
  return (
    <article className={`calendar-summary-tile ${tone}`}>
      <div className={`calendar-summary-icon ${tone}`} aria-hidden="true">
        {icon}
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function SummaryInline({ label, value }: { label: string; value: string }) {
  return (
    <div className="calendar-inline-summary">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
