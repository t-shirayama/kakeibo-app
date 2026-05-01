import { DashboardBars } from "@/components/dashboard-bars";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { categorySummary, recentTransactions } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="ダッシュボード" subtitle="今月の支出、収入、カテゴリ別の傾向を確認できます。" />

      <section className="grid dashboard-grid" aria-label="今月の集計">
        <MetricCard label="今月の支出合計" value={formatCurrency(128450)} delta="前月比 -12,450 (-10.7%)" />
        <MetricCard label="今月の収入合計" value={formatCurrency(250000)} delta="前月比 ±0 (±0%)" />
        <MetricCard label="今月の収支" value={formatCurrency(121550)} delta="前月比 -12,450 (-9.3%)" />
        <MetricCard label="取引件数" value="48件" delta="前月比 +6件 (+14.3%)" />
      </section>

      <section className="grid two-column-grid" style={{ marginTop: 20 }}>
        <div className="card panel">
          <h2 className="panel-title">カテゴリ別支出割合</h2>
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

        <div className="card panel">
          <h2 className="panel-title">支出の推移</h2>
          <DashboardBars />
        </div>
      </section>

      <section className="card panel" style={{ marginTop: 20 }}>
        <h2 className="panel-title">最近の明細</h2>
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
                  <td>{transaction.merchant_name}</td>
                  <td>{transaction.category_name}</td>
                  <td className="amount">{formatCurrency(transaction.amount)}</td>
                  <td>{transaction.payment_method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
