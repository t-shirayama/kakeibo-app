import { PageHeader } from "@/components/page-header";
import { recentTransactions } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";

const badgeClassByCategory: Record<string, string> = {
  食費: "food",
  日用品: "daily",
  交通費: "transport",
  娯楽: "entertainment",
};

export default function TransactionsPage() {
  return (
    <>
      <PageHeader
        title="明細一覧"
        subtitle="取り込んだ明細を検索、絞り込み、手動追加できます。"
        actions={
          <div className="toolbar">
            <input className="input" aria-label="明細検索" placeholder="店名、メモ、カテゴリで検索" />
            <select className="select" aria-label="期間">
              <option>今月</option>
              <option>先月</option>
              <option>今年</option>
            </select>
            <button className="button secondary" type="button">エクスポート</button>
            <button className="button" type="button">手動で追加</button>
          </div>
        }
      />

      <section className="card table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>日付</th>
              <th>店名</th>
              <th>カテゴリ</th>
              <th>金額</th>
              <th>支払い方法</th>
              <th>メモ</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {recentTransactions.map((transaction) => (
              <tr key={transaction.transaction_id}>
                <td>{transaction.transaction_date}</td>
                <td>{transaction.merchant_name}</td>
                <td>
                  <span className={`badge ${badgeClassByCategory[transaction.category_name] ?? "daily"}`}>
                    {transaction.category_name}
                  </span>
                </td>
                <td className="amount">{formatCurrency(transaction.amount)}</td>
                <td>{transaction.payment_method}</td>
                <td>{transaction.memo ?? "-"}</td>
                <td className="muted">編集</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
