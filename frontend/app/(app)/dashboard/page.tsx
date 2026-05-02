"use client";

import { DashboardBars } from "@/components/dashboard-bars";
import { CategoryPieChart } from "@/components/category-pie-chart";
import { useQuery } from "@tanstack/react-query";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { EmptyState, LoadingState } from "@/components/state-block";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { api, api_fetch } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

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

export default function DashboardPage() {
  // ダッシュボードは複数APIを並行取得し、片方が失敗しても取れる情報は表示する。
  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => api_fetch<DashboardSummary>("/api/dashboard/summary"),
  });
  const recentQuery = useQuery({ queryKey: ["recent-transactions"], queryFn: () => api_fetch<Awaited<ReturnType<typeof api.list_transactions>>>("/api/dashboard/recent-transactions") });
  const summary = summaryQuery.data;
  // ローディング中も画面骨格を保つため、未取得データは空配列・0で扱う。
  const categorySummary = summary?.category_summaries ?? [];
  const monthlySummary = summary?.monthly_summaries ?? [];
  const recentTransactions = recentQuery.data ?? [];

  return (
    <>
      <PageHeader title="ダッシュボード" subtitle="今月の支出、収入、カテゴリ別の傾向を確認できます。" />

      <section className="grid dashboard-grid" aria-label="今月の集計">
        <MetricCard label="今月の支出合計" value={formatCurrency(summary?.total_expense ?? 0)} delta={`前月比 ${formatCurrency(summary?.expense_change ?? 0)}`} />
        <MetricCard label="今月の収入合計" value={formatCurrency(summary?.total_income ?? 0)} delta={`前月比 ${formatCurrency(summary?.income_change ?? 0)}`} />
        <MetricCard label="今月の残高" value={formatCurrency(summary?.balance ?? 0)} delta={`前月比 ${formatCurrency(summary?.balance_change ?? 0)}`} />
        <MetricCard label="取引件数" value={`${summary?.transaction_count ?? 0}件`} delta={`前月比 ${summary?.transaction_count_change ?? 0}件`} />
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
            <CategoryPieChart items={categorySummary} />
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
