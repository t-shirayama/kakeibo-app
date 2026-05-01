"use client";

import { DashboardBars } from "@/components/dashboard-bars";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { EmptyState, LoadingState } from "@/components/state-block";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

export default function ReportsPage() {
  const reportQuery = useQuery({ queryKey: ["monthly-report"], queryFn: api.get_monthly_report });
  const exportMutation = useMutation({ mutationFn: api.export_transactions });
  const categorySummary = reportQuery.data?.category_summaries ?? [];

  return (
    <>
      <PageHeader
        title="レポート"
        subtitle="月次の支出推移とカテゴリごとの変化を確認します。"
        actions={
          <div className="toolbar">
            <select className="select" aria-label="対象月">
              <option>2026年4月</option>
              <option>2026年3月</option>
            </select>
            <button className="button secondary" type="button" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
              {exportMutation.isPending ? "出力中" : "Excel"}
            </button>
          </div>
        }
      />

      <section className="grid two-column-grid">
        {reportQuery.error || exportMutation.error ? <ApiErrorAlert error={reportQuery.error || exportMutation.error} /> : null}
        <div className="card panel">
          <h2 className="panel-title">月別支出</h2>
          {reportQuery.isLoading ? <LoadingState /> : <DashboardBars />}
        </div>
        <div className="card panel">
          <h2 className="panel-title">カテゴリ別サマリー</h2>
          {reportQuery.isLoading ? (
            <LoadingState />
          ) : categorySummary.length === 0 ? (
            <EmptyState title="集計データがありません" description="明細が登録されるとカテゴリ別の集計が表示されます。" />
          ) : (
            <div className="category-list">
              {categorySummary.map((category) => (
                <div className="category-row" key={category.category_id}>
                  <span className="swatch" style={{ background: category.color }} />
                  <strong>{category.name}</strong>
                  <span className="amount">{formatCurrency(category.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
