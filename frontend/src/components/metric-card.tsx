import { ArrowDown, ArrowUp, Minus } from "lucide-react";

type MetricDeltaTone = "good" | "bad" | "neutral";
type MetricDeltaDirection = "up" | "down" | "flat";

type MetricCardProps = {
  label: string;
  value: string;
  delta: {
    value: string;
    direction: MetricDeltaDirection;
    tone: MetricDeltaTone;
  };
};

export function MetricCard({ label, value, delta }: MetricCardProps) {
  const DeltaIcon = delta.direction === "up" ? ArrowUp : delta.direction === "down" ? ArrowDown : Minus;
  const directionLabel = delta.direction === "up" ? "上昇" : delta.direction === "down" ? "下降" : "変化なし";

  return (
    <article className="card metric-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      <p className={`metric-delta ${delta.tone}`} aria-label={`前月比 ${directionLabel} ${delta.value}`}>
        <DeltaIcon className="metric-delta-icon" aria-hidden="true" />
        <span>前月比</span>
        <strong>{delta.value}</strong>
      </p>
    </article>
  );
}
