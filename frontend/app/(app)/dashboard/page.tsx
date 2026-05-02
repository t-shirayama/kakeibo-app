"use client";

import { useMemo, useState } from "react";
import { DashboardBars } from "@/components/dashboard-bars";
import { CategoryPieChart, type CategoryPieChartItem } from "@/components/category-pie-chart";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { EmptyState, LoadingState } from "@/components/state-block";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { api, api_fetch } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { ChevronLeft, ChevronRight } from "lucide-react";

type DashboardSummary = {
  total_expense: number;
  total_income: number;
  balance: number;
  transaction_count: number;
  expense_change: number;
  income_change: number;
  balance_change: number;
  transaction_count_change: number;
  category_summaries: Array<{ category_id: string; name: string; color: string; amount: number; ratio: number }>;
  monthly_summaries: Array<{ period: string; total_expense: number; total_income: number; balance: number; transaction_count: number }>;
};

function getDirection(value: number) {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}

function getExpenseTone(value: number) {
  if (value < 0) return "good";
  if (value > 0) return "bad";
  return "neutral";
}

function getPositiveTone(value: number) {
  if (value > 0) return "good";
  if (value < 0) return "bad";
  return "neutral";
}

export default function DashboardPage() {
  const router = useRouter();
  const [selectedYearMonth, setSelectedYearMonth] = useState(getCurrentYearMonth);
  const selectedPeriod = useMemo(() => parseYearMonth(selectedYearMonth), [selectedYearMonth]);
  const metricPeriodLabel = selectedYearMonth === getCurrentYearMonth() ? "今月" : formatYearMonthLabel(selectedYearMonth);

  // ダッシュボードは複数APIを並行取得し、片方が失敗しても取れる情報は表示する。
  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary", selectedPeriod.year, selectedPeriod.month],
    queryFn: () => api_fetch<DashboardSummary>(`/api/dashboard/summary?year=${selectedPeriod.year}&month=${selectedPeriod.month}`),
  });
  const recentQuery = useQuery({ queryKey: ["recent-transactions"], queryFn: () => api_fetch<Awaited<ReturnType<typeof api.list_transactions>>>("/api/dashboard/recent-transactions") });
  const summary = summaryQuery.data;
  // ローディング中も画面骨格を保つため、未取得データは空配列・0で扱う。
  const categorySummary = summary?.category_summaries ?? [];
  const monthlySummary = summary?.monthly_summaries ?? [];
  const recentTransactions = recentQuery.data ?? [];

  function handleCategoryClick(item: CategoryPieChartItem) {
    const range = getMonthDateRange(selectedYearMonth);
    const params = new URLSearchParams({
      date_from: range.date_from,
      date_to: range.date_to,
      category_id: item.category_id,
    });

    router.push(`/transactions?${params.toString()}`);
  }

  return (
    <>
      <PageHeader
        title="ダッシュボード"
        subtitle="対象月の支出、収入、カテゴリ別の傾向を確認できます。"
        actions={
          <div className="month-switcher" aria-label="対象月の切り替え">
            <button className="icon-button" type="button" aria-label="前月" onClick={() => setSelectedYearMonth((value) => addMonths(value, -1))}>
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <label className="month-input-label">
              <span>表示月</span>
              <input className="input month-input" type="month" min="1900-01" max="9999-12" value={selectedYearMonth} onChange={(event) => setSelectedYearMonth(event.target.value || getCurrentYearMonth())} />
            </label>
            <button className="icon-button" type="button" aria-label="翌月" onClick={() => setSelectedYearMonth((value) => addMonths(value, 1))}>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        }
      />

      <section className="grid dashboard-grid" aria-label="今月の集計">
        <MetricCard
          label={`${metricPeriodLabel}の支出合計`}
          value={formatCurrency(summary?.total_expense ?? 0)}
          delta={{
            value: formatCurrency(summary?.expense_change ?? 0),
            direction: getDirection(summary?.expense_change ?? 0),
            tone: getExpenseTone(summary?.expense_change ?? 0),
          }}
        />
        <MetricCard
          label={`${metricPeriodLabel}の収入合計`}
          value={formatCurrency(summary?.total_income ?? 0)}
          delta={{
            value: formatCurrency(summary?.income_change ?? 0),
            direction: getDirection(summary?.income_change ?? 0),
            tone: getPositiveTone(summary?.income_change ?? 0),
          }}
        />
        <MetricCard
          label={`${metricPeriodLabel}の残高`}
          value={formatCurrency(summary?.balance ?? 0)}
          delta={{
            value: formatCurrency(summary?.balance_change ?? 0),
            direction: getDirection(summary?.balance_change ?? 0),
            tone: getPositiveTone(summary?.balance_change ?? 0),
          }}
        />
        <MetricCard
          label="取引件数"
          value={`${summary?.transaction_count ?? 0}件`}
          delta={{
            value: `${summary?.transaction_count_change ?? 0}件`,
            direction: getDirection(summary?.transaction_count_change ?? 0),
            tone: "neutral",
          }}
        />
      </section>

      {summaryQuery.error || recentQuery.error ? <ApiErrorAlert error={summaryQuery.error || recentQuery.error} /> : null}

      <section className="grid two-column-grid section-gap">
        <div className="card panel">
          <h2 className="panel-title">カテゴリ別支出割合</h2>
          {summaryQuery.isLoading ? (
            <LoadingState />
          ) : categorySummary.length === 0 ? (
            <EmptyState title="カテゴリ集計がありません" description="明細を取り込むとカテゴリ別の支出が表示されます。" />
          ) : (
            <CategoryPieChart items={categorySummary} onCategoryClick={handleCategoryClick} />
          )}
        </div>

        <div className="card panel">
          <h2 className="panel-title">支出の推移</h2>
          {summaryQuery.isLoading ? (
            <LoadingState />
          ) : monthlySummary.some((month) => month.total_expense > 0 || month.total_income > 0) ? (
            <DashboardBars summaries={monthlySummary} />
          ) : (
            <EmptyState title="推移データがありません" description="明細を取り込むと直近6ヶ月の収入と支出が表示されます。" />
          )}
        </div>
      </section>

      <section className="card panel section-gap">
        <h2 className="panel-title">最近の明細</h2>
        {recentQuery.isLoading ? (
          <LoadingState />
        ) : recentTransactions.length === 0 ? (
          <EmptyState title="明細がありません" description="PDFアップロードまたは手動追加で明細を登録できます。" />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>日付</th>
                  <th>店名</th>
                  <th>カテゴリ</th>
                  <th>金額</th>
                  <th>支払い方法</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.slice(0, 4).map((transaction) => (
                  <tr key={transaction.transaction_id}>
                    <td>{transaction.transaction_date}</td>
                    <td>{transaction.shop_name}</td>
                    <td>{transaction.category_name ?? "-"}</td>
                    <td className="amount">{formatCurrency(transaction.amount)}</td>
                    <td>{transaction.payment_method ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
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

function formatYearMonthLabel(value: string) {
  const { year, month } = parseYearMonth(value);

  return `${year}年${month}月`;
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
