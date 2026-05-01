import { DashboardBars } from "@/components/dashboard-bars";
import { PageHeader } from "@/components/page-header";
import { categorySummary } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";

export default function ReportsPage() {
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
            <button className="button secondary" type="button">CSV</button>
          </div>
        }
      />

      <section className="grid two-column-grid">
        <div className="card panel">
          <h2 className="panel-title">月別支出</h2>
          <DashboardBars />
        </div>
        <div className="card panel">
          <h2 className="panel-title">カテゴリ別サマリー</h2>
          <div className="category-list">
            {categorySummary.map((category) => (
              <div className="category-row" key={category.category_id}>
                <span className="swatch" style={{ background: category.color }} />
                <strong>{category.name}</strong>
                <span className="amount">{formatCurrency(category.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
