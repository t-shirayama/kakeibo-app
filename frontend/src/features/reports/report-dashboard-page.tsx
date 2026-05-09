"use client";

import { type ReactNode, useEffect, useMemo } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download, PiggyBank, ShoppingCart, TrendingUp, Wallet } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { CategoryPieChart, type CategoryPieChartItem } from "@/components/category-pie-chart";
import { reportsQueryKeys } from "@/features/reports/queryKeys";
import { DashboardBars } from "@/features/reports/components/dashboard-bars";
import {
  buildCategoryComparisonRows,
  buildInsights,
  calculateSavingsRate,
  formatDelta,
  formatPointDelta,
  getDeltaClassName,
  getExpenseTone,
  getPositiveTone,
  type SummaryTone,
} from "@/features/reports/reports-utils";
import { EmptyState, LoadingState } from "@/components/state-block";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { buildAppRouteUrl } from "@/lib/app-route-url";
import { formatCurrency } from "@/lib/format";
import type { DashboardSummaryDto } from "@/lib/types";
import { addMonths, formatYearMonthLabel, getCurrentYearMonth, getMonthDateRange, normalizeYearMonth, parseYearMonth } from "@/lib/year-month";

export function ReportDashboardPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedYearMonth = normalizeYearMonth(searchParams.get("month")) ?? getCurrentYearMonth();
  const selectedPeriod = useMemo(() => parseYearMonth(selectedYearMonth), [selectedYearMonth]);
  const previousYearMonth = useMemo(() => addMonths(selectedYearMonth, -1), [selectedYearMonth]);
  const previousPeriod = useMemo(() => parseYearMonth(previousYearMonth), [previousYearMonth]);
  useEffect(() => {
    if (normalizeYearMonth(searchParams.get("month"))) {
      return;
    }
    const next = new URLSearchParams(searchParams.toString());
    next.set("month", selectedYearMonth);
    router.replace(buildAppRouteUrl(pathname, next));
  }, [pathname, router, searchParams, selectedYearMonth]);
  const summaryQuery = useQuery({
    queryKey: reportsQueryKeys.dashboardSummary(selectedPeriod.year, selectedPeriod.month),
    queryFn: () => api.get_dashboard_summary({ year: selectedPeriod.year, month: selectedPeriod.month }) as Promise<DashboardSummaryDto>,
    placeholderData: keepPreviousData,
  });
  const previousSummaryQuery = useQuery({
    queryKey: reportsQueryKeys.dashboardSummary(previousPeriod.year, previousPeriod.month),
    queryFn: () => api.get_dashboard_summary({ year: previousPeriod.year, month: previousPeriod.month }) as Promise<DashboardSummaryDto>,
    placeholderData: keepPreviousData,
  });
  const exportMutation = useMutation({ mutationFn: api.export_transactions });

  const summary = summaryQuery.data;
  const previousSummary = previousSummaryQuery.data;
  const categorySummary = useMemo(() => summary?.category_summaries ?? [], [summary?.category_summaries]);
  const monthlySummary = useMemo(() => summary?.monthly_summaries ?? [], [summary?.monthly_summaries]);
  const comparisonRows = useMemo(() => buildCategoryComparisonRows(categorySummary, previousSummary?.category_summaries ?? []), [categorySummary, previousSummary?.category_summaries]);
  const insightItems = useMemo(() => buildInsights(summary), [summary]);
  const savingsRate = calculateSavingsRate(summary?.total_income ?? 0, summary?.balance ?? 0);
  const previousSavingsRate = calculateSavingsRate(previousSummary?.total_income ?? 0, previousSummary?.balance ?? 0);
  const hasChartData = monthlySummary.some((month) => month.total_expense > 0 || month.total_income > 0);
  const hasErrors = summaryQuery.error || previousSummaryQuery.error || exportMutation.error;

  function handleCategoryClick(item: CategoryPieChartItem) {
    const range = getMonthDateRange(selectedYearMonth);
    const params = new URLSearchParams({
      date_from: range.date_from,
      date_to: range.date_to,
      category_id: item.category_id,
    });

    window.location.assign(`/transactions?${params.toString()}`);
  }

  function openSelectedMonthTransactions() {
    const range = getMonthDateRange(selectedYearMonth);
    const params = new URLSearchParams(range);
    window.location.assign(`/transactions?${params.toString()}`);
  }

  function updateSelectedYearMonth(nextValue: string) {
    const normalized = normalizeYearMonth(nextValue);
    if (!normalized) {
      return;
    }
    const next = new URLSearchParams(searchParams.toString());
    next.set("month", normalized);
    router.replace(buildAppRouteUrl(pathname, next));
  }

  return (
    <div className="report-dashboard-page" aria-busy={summaryQuery.isFetching || previousSummaryQuery.isFetching}>
      <PageHeader
        title="ダッシュボード"
        subtitle="お金の流れを振り返り、より良い家計管理に役立てましょう。"
        actions={
          <div className="toolbar report-toolbar">
            <div className="month-switcher" aria-label="対象月の切り替え">
              <button className="icon-button" type="button" aria-label="前月" onClick={() => updateSelectedYearMonth(addMonths(selectedYearMonth, -1))}>
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <label className="month-input-label">
                <span className="sr-only">表示月</span>
                <input
                  aria-label="表示月"
                  className="input month-input"
                  type="month"
                  value={selectedYearMonth}
                  onChange={(event) => updateSelectedYearMonth(event.target.value)}
                />
              </label>
              <button className="icon-button" type="button" aria-label="翌月" onClick={() => updateSelectedYearMonth(addMonths(selectedYearMonth, 1))}>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
            <button className="button secondary" type="button" onClick={() => exportMutation.mutate(undefined)} disabled={exportMutation.isPending}>
              <Download size={14} aria-hidden="true" />
              {exportMutation.isPending ? "出力中" : "Excel"}
            </button>
          </div>
        }
      />

      {hasErrors ? <ApiErrorAlert error={summaryQuery.error || previousSummaryQuery.error || exportMutation.error} /> : null}

      <section className="grid report-metric-grid" aria-label="家計サマリー">
        <SummaryCard
          label="収入"
          value={formatCurrency(summary?.total_income ?? 0)}
          delta={formatDelta(summary?.income_change ?? 0)}
          tone={getPositiveTone(summary?.income_change ?? 0)}
          icon={<TrendingUp size={20} aria-hidden="true" />}
          iconTone="income"
        />
        <SummaryCard
          label="支出"
          value={formatCurrency(summary?.total_expense ?? 0)}
          delta={formatDelta(summary?.expense_change ?? 0)}
          tone={getExpenseTone(summary?.expense_change ?? 0)}
          icon={<ShoppingCart size={20} aria-hidden="true" />}
          iconTone="expense"
        />
        <SummaryCard
          label="収支"
          value={formatCurrency(summary?.balance ?? 0)}
          delta={formatDelta(summary?.balance_change ?? 0)}
          tone={getPositiveTone(summary?.balance_change ?? 0)}
          icon={<Wallet size={20} aria-hidden="true" />}
          iconTone="balance"
        />
        <SummaryCard
          label="貯蓄率"
          value={`${savingsRate.toFixed(1)}%`}
          delta={formatPointDelta(savingsRate - previousSavingsRate)}
          tone={getPositiveTone(savingsRate - previousSavingsRate)}
          icon={<PiggyBank size={20} aria-hidden="true" />}
          iconTone="saving"
        />
      </section>

      <section className="grid report-main-grid section-gap">
        <div className="card panel">
          <div className="panel-header">
            <h2 className="panel-title">支出の推移</h2>
            <span className="panel-caption">{formatYearMonthLabel(selectedYearMonth)}までの直近6ヶ月</span>
          </div>
          {summaryQuery.isLoading ? (
            <LoadingState />
          ) : hasChartData ? (
            <DashboardBars summaries={monthlySummary} ariaLabel="直近6ヶ月の支出推移グラフ" />
          ) : (
            <EmptyState title="推移データがありません" description="明細を取り込むと直近6ヶ月の収入と支出が表示されます。" />
          )}
        </div>

        <div className="card panel">
          <h2 className="panel-title">今月の気づき</h2>
          {summaryQuery.isLoading ? (
            <LoadingState />
          ) : (
            <div className="dashboard-side-stack">
              {insightItems.length === 0 ? (
                <EmptyState title="気づきを表示できません" description="明細が登録されると、この月の傾向をここに表示します。" />
              ) : (
                <div className="insight-list">
                  {insightItems.map((insight) => (
                    <article className={`insight-card ${insight.tone}`} key={insight.title}>
                      <div className="insight-icon" aria-hidden="true">
                        {renderInsightIcon(insight.iconKey)}
                      </div>
                      <div>
                        <strong>{insight.title}</strong>
                        <p>{insight.description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="grid report-bottom-grid section-gap">
        <div className="card panel">
          <div className="panel-header">
            <h2 className="panel-title">カテゴリ別支出（前月比）</h2>
            <button className="text-link-button" type="button" onClick={openSelectedMonthTransactions}>
              明細を詳しく見る
            </button>
          </div>
          {summaryQuery.isLoading || previousSummaryQuery.isLoading ? (
            <LoadingState />
          ) : comparisonRows.length === 0 ? (
            <EmptyState title="カテゴリ集計がありません" description="支出明細が登録されるとカテゴリ別の比較が表示されます。" />
          ) : (
            <div className="table-wrap dashboard-comparison-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>カテゴリ</th>
                    <th className="amount-column">今月の支出</th>
                    <th className="amount-column">前月の支出</th>
                    <th className="amount-column">前月比</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.category_id}>
                      <td>
                        <div className="category-name-cell">
                          <span className="swatch" style={{ background: row.color }} />
                          <strong>{row.name}</strong>
                        </div>
                      </td>
                      <td className="amount amount-column">{formatCurrency(row.current_amount)}</td>
                      <td className="amount amount-column">{formatCurrency(row.previous_amount)}</td>
                      <td className={`amount amount-column ${getDeltaClassName(row.delta)}`}>{formatDelta(row.delta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card panel category-pie-panel">
          <div className="panel-header">
            <h2 className="panel-title">カテゴリ別支出の割合</h2>
            <span className="panel-caption">クリックで対象カテゴリの明細へ移動</span>
          </div>
          {summaryQuery.isLoading ? (
            <LoadingState />
          ) : categorySummary.length === 0 ? (
            <EmptyState title="カテゴリ集計がありません" description="支出明細が登録されると円グラフを表示します。" />
          ) : (
            <CategoryPieChart items={categorySummary} onCategoryClick={handleCategoryClick} centerLabel="支出合計" />
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  delta,
  tone,
  icon,
  iconTone,
}: {
  label: string;
  value: string;
  delta: string;
  tone: SummaryTone;
  icon: ReactNode;
  iconTone: "income" | "expense" | "balance" | "saving";
}) {
  return (
    <article className="card summary-card">
      <div className={`summary-card-icon ${iconTone}`}>{icon}</div>
      <div className="summary-card-body">
        <p className="summary-card-label">{label}</p>
        <p className="summary-card-value">{value}</p>
        <p className={`summary-card-delta ${tone}`}>前月比 {delta}</p>
      </div>
    </article>
  );
}

function renderInsightIcon(iconKey: "shopping" | "trend" | "saving") {
  if (iconKey === "shopping") {
    return <ShoppingCart size={18} />;
  }
  if (iconKey === "trend") {
    return <TrendingUp size={18} />;
  }
  return <PiggyBank size={18} />;
}
