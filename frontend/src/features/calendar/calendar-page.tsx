"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, CreditCard, ReceiptText, Wallet } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { LoadingState } from "@/components/state-block";
import { PageHeader } from "@/components/page-header";
import { calendarQueryKeys } from "@/features/calendar/queryKeys";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { getTransactionCategoryDisplay } from "@/lib/transaction-category";
import type { TransactionDto } from "@/lib/types";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

type DailyCalendarSummary = {
  date: string;
  day: number;
  weekday: number;
  expense_total: number;
  income_total: number;
  transaction_count: number;
  holiday_name: string | null;
};

export function CalendarPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedYearMonth = normalizeYearMonth(searchParams.get("month")) ?? getCurrentYearMonth();
  const [selectedDate, setSelectedDate] = useState(getTodayDateString);
  const range = useMemo(() => getMonthDateRange(selectedYearMonth), [selectedYearMonth]);
  const transactionsQuery = useQuery({
    queryKey: calendarQueryKeys.transactions(range.date_from, range.date_to),
    queryFn: () => api.list_all_transactions(range),
  });

  const transactions = useMemo(() => transactionsQuery.data ?? [], [transactionsQuery.data]);
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
    replaceCurrentUrl(pathname, next);
  }, [pathname, searchParams, selectedYearMonth]);

  useEffect(() => {
    router.prefetch("/transactions");
  }, [router]);

  function updateSelectedYearMonth(nextValue: string) {
    const normalized = normalizeYearMonth(nextValue) ?? getCurrentYearMonth();
    setSelectedDate(getDefaultSelectedDate(normalized, transactions));
    const next = new URLSearchParams(searchParams.toString());
    next.set("month", normalized);
    replaceCurrentUrl(pathname, next);
  }

  function openTransactions(dateFrom: string, dateTo: string) {
    const next = new URLSearchParams({
      date_from: dateFrom,
      date_to: dateTo,
    });
    router.push(`/transactions?${next.toString()}`);
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
                    <span className="calendar-day-expense-label">支出</span>
                    <strong className="calendar-day-expense">{day.expense_total === 0 ? "¥0" : formatCurrency(day.expense_total)}</strong>
                    <span className="calendar-day-meta">{formatCalendarDayMeta(day)}</span>
                  </button>
                ) : (
                  <div key={day.date} className={`calendar-day placeholder${getCalendarDayToneClassName(day)}`} aria-hidden="true" />
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
                <div>
                  <h2 className="panel-title">選択日の明細</h2>
                  <p className="panel-caption">{selectedDaySummary ? formatDateLabel(selectedDaySummary.date) : "日付を選択してください"}</p>
                </div>
                {selectedDaySummary ? (
                  <button className="text-link-button" type="button" onClick={() => openTransactions(selectedDaySummary.date, selectedDaySummary.date)}>
                    明細一覧で確認
                  </button>
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
  const holidays = getJapaneseHolidayMap(year);
  const dailySummaryMap = new Map<string, DailyCalendarSummary>();

  for (const transaction of transactions) {
    const existing = dailySummaryMap.get(transaction.transaction_date) ?? createCalendarDaySummary(transaction.transaction_date, holidays);

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
    cells.push(createCalendarDaySummary(formatDateParam(date), holidays));
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${selectedYearMonth}-${String(day).padStart(2, "0")}`;
    cells.push(dailySummaryMap.get(date) ?? createCalendarDaySummary(date, holidays));
  }

  while (cells.length % 7 !== 0) {
    const trailingDay = cells.length - (leadingDays + daysInMonth) + 1;
    const date = new Date(year, month, trailingDay);
    cells.push(createCalendarDaySummary(formatDateParam(date), holidays));
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

function normalizeYearMonth(value: string | null) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return null;
  }
  return value;
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

function formatCalendarDayMeta(day: DailyCalendarSummary) {
  if (day.transaction_count === 0) {
    return day.income_total > 0 ? "- / 収入あり" : "-";
  }

  return `${day.transaction_count}件${day.income_total > 0 ? " / 収入あり" : ""}`;
}

function buildCalendarDayAriaLabel(day: DailyCalendarSummary) {
  const holiday = day.holiday_name ? ` 祝日${day.holiday_name}` : "";
  return `${day.date}${holiday} 支出${formatCurrency(day.expense_total)} 収入${formatCurrency(day.income_total)}`;
}

function getCalendarWeekdayClassName(weekday: number) {
  if (weekday === 0) {
    return "holiday";
  }
  if (weekday === 6) {
    return "saturday";
  }
  return "";
}

function getCalendarDayToneClassName(day: DailyCalendarSummary) {
  if (day.holiday_name || day.weekday === 0) {
    return " holiday";
  }
  if (day.weekday === 6) {
    return " saturday";
  }
  return "";
}

function createCalendarDaySummary(date: string, holidays: Map<string, string>): DailyCalendarSummary {
  const weekday = new Date(`${date}T00:00:00`).getDay();
  return {
    date,
    day: Number(date.slice(-2)),
    weekday,
    expense_total: 0,
    income_total: 0,
    transaction_count: 0,
    holiday_name: holidays.get(date) ?? null,
  };
}

function getJapaneseHolidayMap(year: number) {
  const holidays = new Map<string, string>();

  addHoliday(holidays, year, 1, 1, "元日");
  addHoliday(holidays, year, 1, getComingOfAgeDay(year), "成人の日");
  addHoliday(holidays, year, 2, 11, "建国記念の日");
  addHoliday(holidays, year, 2, getEmperorsBirthday(year), "天皇誕生日");
  addHoliday(holidays, year, 3, getSpringEquinoxDay(year), "春分の日");
  addHoliday(holidays, year, 4, 29, getAprilHolidayName(year));
  addHoliday(holidays, year, 5, 3, "憲法記念日");
  addHoliday(holidays, year, 5, 4, getGreeneryDayName(year));
  addHoliday(holidays, year, 5, 5, "こどもの日");
  addHoliday(holidays, year, 7, getMarineDay(year), "海の日");
  addHoliday(holidays, year, 8, getMountainDay(year), "山の日");
  addHoliday(holidays, year, 9, getRespectForAgedDay(year), "敬老の日");
  addHoliday(holidays, year, 9, getAutumnEquinoxDay(year), "秋分の日");
  addHoliday(holidays, year, 10, getSportsDay(year), getSportsDayName(year));
  addHoliday(holidays, year, 11, 3, "文化の日");
  addHoliday(holidays, year, 11, 23, "勤労感謝の日");
  addHoliday(holidays, year, 12, getFormerEmperorsBirthday(year), "天皇誕生日");

  if (year === 2019) {
    addHoliday(holidays, year, 5, 1, "天皇の即位の日");
    addHoliday(holidays, year, 10, 22, "即位礼正殿の儀");
  }

  applyCitizensHoliday(holidays, year);
  applySubstituteHolidays(holidays, year);

  return holidays;
}

function addHoliday(holidays: Map<string, string>, year: number, month: number, day: number | null, name: string) {
  if (!day) {
    return;
  }
  holidays.set(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, name);
}

function getComingOfAgeDay(year: number) {
  if (year >= 2000) {
    return getNthWeekdayOfMonth(year, 1, 1, 2);
  }
  return year >= 1949 ? 15 : null;
}

function getEmperorsBirthday(year: number) {
  if (year >= 2020) {
    return 23;
  }
  return null;
}

function getFormerEmperorsBirthday(year: number) {
  return year >= 1989 && year <= 2018 ? 23 : null;
}

function getAprilHolidayName(year: number) {
  return year >= 2007 ? "昭和の日" : "みどりの日";
}

function getGreeneryDayName(year: number) {
  return year >= 2007 ? "みどりの日" : "国民の休日";
}

function getMarineDay(year: number) {
  if (year === 2020) {
    return 23;
  }
  if (year === 2021) {
    return 22;
  }
  if (year >= 2003) {
    return getNthWeekdayOfMonth(year, 7, 1, 3);
  }
  return year >= 1996 ? 20 : null;
}

function getMountainDay(year: number) {
  if (year === 2020) {
    return 10;
  }
  if (year === 2021) {
    return 8;
  }
  return year >= 2016 ? 11 : null;
}

function getRespectForAgedDay(year: number) {
  if (year >= 2003) {
    return getNthWeekdayOfMonth(year, 9, 1, 3);
  }
  return year >= 1966 ? 15 : null;
}

function getSportsDay(year: number) {
  if (year === 2020) {
    return 24;
  }
  if (year === 2021) {
    return 23;
  }
  if (year >= 2000) {
    return getNthWeekdayOfMonth(year, 10, 1, 2);
  }
  return year >= 1966 ? 10 : null;
}

function getSportsDayName(year: number) {
  return year >= 2020 ? "スポーツの日" : "体育の日";
}

function getSpringEquinoxDay(year: number) {
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function getAutumnEquinoxDay(year: number) {
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function getNthWeekdayOfMonth(year: number, month: number, weekday: number, occurrence: number) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const offset = (weekday - firstDay + 7) % 7;
  return 1 + offset + (occurrence - 1) * 7;
}

function applyCitizensHoliday(holidays: Map<string, string>, year: number) {
  for (let month = 1; month <= 12; month += 1) {
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 2; day < daysInMonth; day += 1) {
      const current = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (holidays.has(current)) {
        continue;
      }
      const previous = `${year}-${String(month).padStart(2, "0")}-${String(day - 1).padStart(2, "0")}`;
      const next = `${year}-${String(month).padStart(2, "0")}-${String(day + 1).padStart(2, "0")}`;
      const weekday = new Date(`${current}T00:00:00`).getDay();
      if (weekday !== 0 && weekday !== 6 && holidays.has(previous) && holidays.has(next)) {
        holidays.set(current, "国民の休日");
      }
    }
  }
}

function applySubstituteHolidays(holidays: Map<string, string>, year: number) {
  const sortedDates = [...holidays.keys()].sort();
  for (const date of sortedDates) {
    const weekday = new Date(`${date}T00:00:00`).getDay();
    if (weekday !== 0 || date < "1973-04-12") {
      continue;
    }

    let substituteDate = addDays(date, 1);
    while (holidays.has(substituteDate)) {
      substituteDate = addDays(substituteDate, 1);
    }
    if (substituteDate.startsWith(`${year}-`)) {
      holidays.set(substituteDate, "振替休日");
    }
  }
}

function addDays(date: string, days: number) {
  const base = new Date(`${date}T00:00:00`);
  base.setDate(base.getDate() + days);
  return formatDateParam(base);
}

function replaceCurrentUrl(pathname: string, searchParams: URLSearchParams) {
  window.history.replaceState(null, "", `${pathname}?${searchParams.toString()}`);
}
