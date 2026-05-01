const monthlyValues = [
  { label: "11月", value: 72 },
  { label: "12月", value: 94 },
  { label: "1月", value: 64 },
  { label: "2月", value: 82 },
  { label: "3月", value: 108 },
  { label: "4月", value: 88 },
];

export function DashboardBars() {
  return (
    <div>
      <div className="chart-bars" aria-label="月別支出グラフ">
        {monthlyValues.map((month) => (
          <div
            className="chart-bar"
            key={month.label}
            style={{ height: `${month.value}px` }}
            title={`${month.label}: ${month.value},000円`}
          />
        ))}
      </div>
      <div className="toolbar chart-labels">
        {monthlyValues.map((month) => (
          <span className="muted" key={month.label}>
            {month.label}
          </span>
        ))}
      </div>
    </div>
  );
}
