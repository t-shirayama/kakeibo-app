"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, CreditCard, ReceiptText, Wallet } from "lucide-react";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { LoadingState } from "@/components/state-block";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import type { TransactionDto } from "@/lib/types";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

type DailyCalendarSummary = {
  date: string;
  day: number;
  expense_total: number;
  income_total: number;
  transaction_count: number;
};

type CategoryMonthlySummary = {
  category_id: string;
  name: string;
  amount: number;
  color: string;
  ratio: number;
  transaction_count: number;
};

export function CalendarPage() {
  const [selectedYearMonth, setSelectedYearMonth] = useState(getCurrentYearMonth);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString);
  const range = useMemo(() => getMonthDateRange(selectedYearMonth), [selectedYearMonth]);
  const transactionsQuery = useQuery({
    queryKey: ["calendar-transactions", range.date_from, range.date_to],
    queryFn: () => api.list_all_transactions(range),
  });

  const transactions = transactionsQuery.data ?? [];
  const calendarDays = useMemo(() => buildCalendarDays(selectedYearMonth, transactions), [selectedYearMonth, transactions]);
  const monthlySummary = useMemo(() => buildMonthlySummary(transactions), [transactions]);
  const categorySummaries = useMemo(() => buildCategorySummaries(transactions), [transactions]);
  const selectedDaySummary = useMemo(
    () => calendarDays.find((day) => day.date === selectedDate) ?? calendarDays.find((day) => day.date.startsWith(selectedYearMonth)) ?? null,
    [calendarDays, selectedDate, selectedYearMonth],
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
    if (isDateInYearMonth(selectedDate, selectedYearMonth)) {
      return;
    }
    setSelectedDate(getDefaultSelectedDate(selectedYearMonth, transactions));
  }, [selectedDate, selectedYearMonth, transactions]);

  return (
    <div className="calendar-page">
      <PageHeader
        title="カレンダー"
        subtitle="月ごとの支出の波を日別に確認し、気になる日はそのまま明細へ掘り下げられます。"
        actions={
          <div className="toolbar report-toolbar">
            <div className="month-switcher" aria-label="対象月の切り替え">
              <button className="icon-button" type="button" aria-label="前月" onClick={() => setSelectedYearMonth((value) => addMonths(value, -1))}>
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <label className="month-input-label">
                <span className="sr-only">表示月</span>
                <input aria-label="表示月" className="input month-input" type="month" min="1900-01" max="9999-12" value={selectedYearMonth} onChange={(event) => setSelectedYearMonth(event.target.value || getCurrentYearMonth())} />
              </label>
              <button className="icon-button" type="button" aria-label="翌月" onClick={() => setSelectedYearMonth((value) => addMonths(value, 1))}>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        }
      />

      {transactionsQuery.error ? <ApiErrorAlert error={transactionsQuery.error} /> : null}

      {transactionsQuery.isLoading ? (
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
              <Link className="text-link-button" href={`/transactions?date_from=${range.date_from}&date_to=${range.date_to}`}>
                この月の明細一覧へ
              </Link>
            </div>

            <div className="calendar-weekdays" aria-hidden="true">
              {WEEKDAY_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            <div className="calendar-grid" role="grid" aria-label={`${formatYearMonthLabel(selectedYearMonth)}の支出カレンダー`}>
              {calendarDays.map((day) =>
                day.date.startsWith(selectedYearMonth) ? (
                  <button
                    key={day.date}
                    className={`calendar-day${day.date === selectedDaySummary?.date ? " selected" : ""}${day.expense_total > 0 ? " has-expense" : ""}${day.income_total > 0 ? " has-income" : ""}`}
                    type="button"
                    role="gridcell"
                    aria-label={`${day.date} 支出${formatCurrency(day.expense_total)} 収入${formatCurrency(day.income_total)}`}
                    onClick={() => setSelectedDate(day.date)}
                  >
                    <span className="calendar-day-number">{day.day}</span>
                    <span className="calendar-day-expense-label">支出</span>
                    <strong className="calendar-day-expense">{day.expense_total === 0 ? "¥0" : formatCurrency(day.expense_total)}</strong>
                    <span className="calendar-day-meta">
                      {day.transaction_count > 0 ? `${day.transaction_count}件` : "明細なし"}
                      {day.income_total > 0 ? " / 収入あり" : ""}
                    </span>
                  </button>
                ) : (
                  <div key={day.date} className="calendar-day placeholder" aria-hidden="true" />
                ),
              )}
            </div>
          </section>

          <aside className="calendar-sidebar">
            <section className="card panel">
              <h2 className="panel-title">月間サマリー</h2>
              <div className="calendar-summary-grid" aria-label="月間サマリー">
                <SummaryTile icon={<Wallet size={16} aria-hidden="true" />} label="収入" value={formatCurrency(monthlySummary.total_income)} tone="income" />
                <SummaryTile icon={<CreditCard size={16} aria-hidden="true" />} label="支出" value={formatCurrency(monthlySummary.total_expense)} tone="expense" />
                <SummaryTile icon={<ReceiptText size={16} aria-hidden="true" />} label="収支" value={formatCurrency(monthlySummary.balance)} tone={monthlySummary.balance >= 0 ? "income" : "expense"} />
              </div>
            </section>

            <section className="card panel">
              <div className="panel-header">
                <h2 className="panel-title">カテゴリ別サマリー</h2>
                <span className="panel-caption">支出が多い順</span>
              </div>
              {categorySummaries.length === 0 ? (
                <p className="calendar-panel-empty">この月の支出明細はまだありません。</p>
              ) : (
                <div className="calendar-category-list" aria-label="カテゴリ別サマリー">
                  {categorySummaries.map((category) => (
                    <div className="calendar-category-row" key={category.category_id}>
                      <div className="category-name-cell">
                        <span className="swatch" style={{ background: category.color }} />
                        <strong>{category.name}</strong>
                      </div>
                      <span className="amount">{formatCurrency(category.amount)}</span>
                      <span className="calendar-category-meta">{Math.round(category.ratio * 100)}% / {category.transaction_count}件</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="card panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">選択日の明細</h2>
                  <p className="panel-caption">{selectedDaySummary ? formatDateLabel(selectedDaySummary.date) : "日付を選択してください"}</p>
                </div>
                {selectedDaySummary ? (
                  <Link className="text-link-button" href={`/transactions?date_from=${selectedDaySummary.date}&date_to=${selectedDaySummary.date}`}>
                    明細一覧で確認
                  </Link>
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
                            <p>{transaction.category_name ?? "未分類"}{transaction.memo ? ` / ${transaction.memo}` : ""}</p>
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
  tone: "income" | "expense";
}) {
  return (
    <article className={`calendar-summary-tile ${tone}`}>
      <div className="calendar-summary-icon" aria-hidden="true">
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

function buildCalendarDays(selectedYearMonth: string, transactions: TransactionDto[]) {
  const { year, month } = parseYearMonth(selectedYearMonth);
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailySummaryMap = new Map<string, DailyCalendarSummary>();

  for (const transaction of transactions) {
    const existing = dailySummaryMap.get(transaction.transaction_date) ?? {
      date: transaction.transaction_date,
      day: Number(transaction.transaction_date.slice(-2)),
      expense_total: 0,
      income_total: 0,
      transaction_count: 0,
    };

    if (transaction.transaction_type === "expense") {
      existing.expense_total += transaction.amount;
    } else {
      existing.income_total += transaction.amount;
    }
    existing.transaction_count += 1;
    dailySummaryMap.set(transaction.transaction_date, existing);
  }

  const leadingDays = firstDay.getDay();
  const cells: DailyCalendarSummary[] = [];
  for (let index = leadingDays; index > 0; index -= 1) {
    const date = new Date(year, month - 1, 1 - index);
    cells.push({ date: formatDateParam(date), day: date.getDate(), expense_total: 0, income_total: 0, transaction_count: 0 });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${selectedYearMonth}-${String(day).padStart(2, "0")}`;
    cells.push(
      dailySummaryMap.get(date) ?? {
        date,
        day,
        expense_total: 0,
        income_total: 0,
        transaction_count: 0,
      },
    );
  }

  while (cells.length % 7 !== 0) {
    const trailingDay = cells.length - (leadingDays + daysInMonth) + 1;
    const date = new Date(year, month, trailingDay);
    cells.push({ date: formatDateParam(date), day: date.getDate(), expense_total: 0, income_total: 0, transaction_count: 0 });
  }

  return cells;
}

function buildMonthlySummary(transactions: TransactionDto[]) {
  const total_income = transactions.filter((transaction) => transaction.transaction_type === "income").reduce((sum, transaction) => sum + transaction.amount, 0);
  const total_expense = transactions.filter((transaction) => transaction.transaction_type === "expense").reduce((sum, transaction) => sum + transaction.amount, 0);

  return {
    total_income,
    total_expense,
    balance: total_income - total_expense,
  };
}

function buildCategorySummaries(transactions: TransactionDto[]): CategoryMonthlySummary[] {
  const expenseTransactions = transactions.filter((transaction) => transaction.transaction_type === "expense");
  const totalExpense = expenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const categoryMap = new Map<string, CategoryMonthlySummary>();

  for (const transaction of expenseTransactions) {
    const key = transaction.category_id || "uncategorized";
    const existing = categoryMap.get(key) ?? {
      category_id: key,
      name: transaction.category_name ?? "未分類",
      amount: 0,
      color: inferCategoryColor(transaction.category_name),
      ratio: 0,
      transaction_count: 0,
    };
    existing.amount += transaction.amount;
    existing.transaction_count += 1;
    categoryMap.set(key, existing);
  }

  return [...categoryMap.values()]
    .sort((a, b) => b.amount - a.amount)
    .map((item) => ({
      ...item,
      ratio: totalExpense > 0 ? item.amount / totalExpense : 0,
    }));
}

function inferCategoryColor(categoryName?: string) {
  if (!categoryName) {
    return "#cbd5e1";
  }

  const fallbackColors = ["#fb7185", "#f59e0b", "#38bdf8", "#34d399", "#a78bfa", "#94a3b8"];
  const code = [...categoryName].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return fallbackColors[code % fallbackColors.length];
}

function getDefaultSelectedDate(selectedYearMonth: string, transactions: TransactionDto[]) {
  const today = getTodayDateString();
  if (isDateInYearMonth(today, selectedYearMonth)) {
    return today;
  }

  const latestExpenseDate = [...transactions]
    .filter((transaction) => transaction.transaction_type === "expense")
    .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))[0]?.transaction_date;

  return latestExpenseDate ?? `${selectedYearMonth}-01`;
}

function getCurrentYearMonth() {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? String(new Date().getFullYear());
  const month = parts.find((part) => part.type === "month")?.value ?? String(new Date().getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function getTodayDateString() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "2000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function parseYearMonth(value: string) {
  const [year, month] = value.split("-").map(Number);

  return {
    year: Number.isInteger(year) ? year : Number(getCurrentYearMonth().slice(0, 4)),
    month: Number.isInteger(month) ? month : Number(getCurrentYearMonth().slice(5, 7)),
  };
}

function addMonths(value: string, amount: number) {
  const { year, month } = parseYearMonth(value);
  const date = new Date(year, month - 1 + amount, 1);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthDateRange(value: string) {
  const { year, month } = parseYearMonth(value);
  const lastDay = new Date(year, month, 0).getDate();
  const paddedMonth = String(month).padStart(2, "0");

  return {
    date_from: `${year}-${paddedMonth}-01`,
    date_to: `${year}-${paddedMonth}-${String(lastDay).padStart(2, "0")}`,
  };
}

function formatYearMonthLabel(value: string) {
  const { year, month } = parseYearMonth(value);

  return `${year}年${month}月`;
}

function formatDateLabel(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

function isDateInYearMonth(date: string, yearMonth: string) {
  return date.startsWith(`${yearMonth}-`);
}

function formatDateParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
