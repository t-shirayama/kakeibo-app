type MetricCardProps = {
  label: string;
  value: string;
  delta: string;
};

export function MetricCard({ label, value, delta }: MetricCardProps) {
  return (
    <article className="card metric-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      <p className="metric-delta">{delta}</p>
    </article>
  );
}
