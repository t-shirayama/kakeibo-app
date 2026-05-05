"use client";

import { type ReactNode, useEffect, useMemo } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download, PiggyBank, ShoppingCart, TrendingUp, Wallet } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { CategoryPieChart, type CategoryPieChartItem } from "@/components/category-pie-chart";
import { reportsQueryKeys } from "@/features/reports/queryKeys";
import { DashboardBars } from "@/features/reports/components/dashboard-bars";
import { EmptyState, LoadingState } from "@/components/state-block";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { buildAppRouteUrl } from "@/lib/app-route-url";
import { formatCurrency } from "@/lib/format";
import type { DashboardSummaryDto } from "@/lib/types";

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
                        {insight.icon}
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
  tone: "good" | "bad" | "neutral";
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

function buildCategoryComparisonRows(current: DashboardSummaryDto["category_summaries"], previous: DashboardSummaryDto["category_summaries"]) {
  const previousMap = new Map(previous.map((item) => [item.category_id, item]));
  return [...current]
    .sort((a, b) => b.amount - a.amount)
    .map((item) => {
      const previousItem = previousMap.get(item.category_id);
      const previousAmount = previousItem?.amount ?? 0;
      return {
        category_id: item.category_id,
        name: item.name,
        color: item.color,
        current_amount: item.amount,
        previous_amount: previousAmount,
        delta: item.amount - previousAmount,
      };
    });
}

function buildInsights(summary?: DashboardSummaryDto) {
  if (!summary) {
    return [];
  }

  const topCategory = [...summary.category_summaries].sort((a, b) => b.amount - a.amount)[0];
  const sixMonthAverageExpense =
    summary.monthly_summaries.length > 0 ? summary.monthly_summaries.reduce((sum, month) => sum + month.total_expense, 0) / summary.monthly_summaries.length : 0;
  const expenseGap = summary.total_expense - sixMonthAverageExpense;
  const savingRate = calculateSavingsRate(summary.total_income, summary.balance);

  const insights: Array<{ title: string; description: string; tone: "good" | "alert" | "info"; icon: ReactNode }> = [];
  if (topCategory && topCategory.amount > 0) {
    insights.push({
      title: `${topCategory.name}が支出の${Math.round(topCategory.ratio * 100)}%を占めています`,
      description: `${topCategory.name}の支出は${formatCurrency(topCategory.amount)}です。固定費と変動費の見直し候補として確認しやすい状態です。`,
      tone: "good" as const,
      icon: <ShoppingCart size={18} />,
    });
  }

  insights.push({
    title: expenseGap <= 0 ? `支出合計は過去6ヶ月平均より${formatCurrency(Math.abs(Math.round(expenseGap)))}少ないです` : `支出合計は過去6ヶ月平均より${formatCurrency(Math.round(expenseGap))}多いです`,
    description: expenseGap <= 0 ? "今月は平均より支出を抑えられています。この調子で続けやすい支出項目を確認しましょう。" : "平均を上回っているため、増加要因のカテゴリを確認すると振り返りしやすくなります。",
    tone: expenseGap <= 0 ? ("info" as const) : ("alert" as const),
    icon: <TrendingUp size={18} />,
  });

  insights.push({
    title: `貯蓄率は${savingRate.toFixed(1)}%です`,
    description: summary.total_income > 0 ? `収入${formatCurrency(summary.total_income)}に対して${formatCurrency(summary.balance)}を残せています。` : "収入が0円のため、今月の貯蓄率は0%として表示しています。",
    tone: savingRate >= 20 ? ("good" as const) : ("info" as const),
    icon: <PiggyBank size={18} />,
  });

  return insights;
}

function calculateSavingsRate(income: number, balance: number) {
  if (income <= 0) {
    return 0;
  }
  return (balance / income) * 100;
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

function formatDelta(value: number) {
  if (value > 0) {
    return `+${formatCurrency(value)}`;
  }
  if (value < 0) {
    return `-${formatCurrency(Math.abs(value))}`;
  }
  return formatCurrency(0);
}

function formatPointDelta(value: number) {
  if (value > 0) {
    return `+${value.toFixed(1)}pt`;
  }
  if (value < 0) {
    return `${value.toFixed(1)}pt`;
  }
  return "0.0pt";
}

function getDeltaClassName(value: number) {
  if (value < 0) {
    return "expense-improved";
  }
  if (value > 0) {
    return "expense-worse";
  }
  return "expense-neutral";
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
