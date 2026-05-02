import { formatCurrency } from "@/lib/format";

type MonthlySummary = {
  period: string;
  total_expense: number;
  total_income: number;
};

type DashboardBarsProps = {
  summaries: MonthlySummary[];
  ariaLabel?: string;
};

export function DashboardBars({ summaries, ariaLabel = "直近6ヶ月の月別収入支出グラフ" }: DashboardBarsProps) {
  const maxAmount = Math.max(...summaries.flatMap((month) => [month.total_expense, month.total_income]), 0);
  const scaleMax = Math.max(Math.ceil(maxAmount / 50000) * 50000, 50000);
  const ticks = [scaleMax, Math.round(scaleMax * 0.67), Math.round(scaleMax * 0.33), 0];
  const averageExpense = summaries.length > 0 ? summaries.reduce((sum, month) => sum + month.total_expense, 0) / summaries.length : 0;
  const averageExpensePercent = barHeight(averageExpense, scaleMax);

  return (
    <div className="chart-shell" aria-label="直近6ヶ月の収入と支出の推移">
      <div className="chart-plot">
        <div className="chart-y-axis" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick}>{formatShortCurrency(tick)}</span>
          ))}
        </div>
        <div className="chart-bars" role="img" aria-label={ariaLabel}>
          {averageExpense > 0 ? (
            <div className="chart-average-line" style={{ bottom: `${averageExpensePercent}%` }} aria-hidden="true">
              <span>平均支出 {formatCurrency(Math.round(averageExpense))}</span>
            </div>
          ) : null}
          {summaries.map((month) => (
            <div className="chart-month" key={month.period}>
              <div className="chart-bar-group">
                <div
                  className="chart-bar chart-bar-income"
                  style={{ height: `${barHeight(month.total_income, scaleMax)}%` }}
                  title={`${formatMonthLabel(month.period)} 収入: ${formatCurrency(month.total_income)}`}
                />
                <div
                  className="chart-bar chart-bar-expense"
                  style={{ height: `${barHeight(month.total_expense, scaleMax)}%` }}
                  title={`${formatMonthLabel(month.period)} 支出: ${formatCurrency(month.total_expense)}`}
                />
              </div>
              <span className="chart-month-label">{formatMonthLabel(month.period)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="chart-legend" aria-label="グラフ凡例">
        <span>
          <i className="chart-legend-swatch chart-legend-income" />
          収入
        </span>
        <span>
          <i className="chart-legend-swatch chart-legend-expense" />
          支出
        </span>
        <span>
          <i className="chart-legend-swatch chart-legend-average" />
          平均支出
        </span>
      </div>
    </div>
  );
}

function barHeight(amount: number, scaleMax: number) {
  if (amount <= 0) {
    return 0;
  }
  return Math.max((amount / scaleMax) * 100, 4);
}

function formatMonthLabel(period: string) {
  const [, month] = period.split("-");
  return `${Number(month)}月`;
}

function formatShortCurrency(amount: number) {
  if (amount >= 10000) {
    return `${Math.round(amount / 10000)}万`;
  }
  return `${amount}`;
}
