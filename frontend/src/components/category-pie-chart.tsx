"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/format";

export type CategoryPieChartItem = {
  category_id: string;
  name: string;
  color: string;
  amount: number;
  ratio?: number;
};

type CategoryPieChartProps = {
  items: CategoryPieChartItem[];
  onCategoryClick?: (item: CategoryPieChartItem) => void;
};

export function CategoryPieChart({ items, onCategoryClick }: CategoryPieChartProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const segments = buildSegments(items, total);
  const activeItem = segments.rows.find((item) => item.category_id === activeCategoryId) ?? null;
  const activeHighlight = activeItem
    ? `conic-gradient(transparent 0% ${activeItem.startPercent}%, ${activeItem.color} ${activeItem.startPercent}% ${activeItem.endPercent}%, transparent ${activeItem.endPercent}% 100%)`
    : undefined;

  return (
    <div className="category-pie-layout">
      <div className="category-pie-chart-wrap">
        <div
          className={`category-pie-chart${activeItem ? " is-dimmed" : ""}`}
          aria-label="カテゴリ別支出割合の円グラフ"
          role="img"
          style={{ background: segments.gradient }}
        >
          {activeItem ? (
            <div
              className="category-pie-highlight"
              data-active-category={activeItem.category_id}
              aria-hidden="true"
              style={{ background: activeHighlight }}
            />
          ) : null}
        </div>
        <div className="category-pie-center">
          <span>合計</span>
          <strong>{formatCurrency(total)}</strong>
        </div>
      </div>
      <div className="category-pie-legend">
        {segments.rows.map((item) => (
          <button
            className={`category-pie-legend-row category-row${item.category_id === activeCategoryId ? " active" : ""}`}
            key={item.category_id}
            type="button"
            aria-pressed={item.category_id === activeCategoryId}
            onBlur={() => setActiveCategoryId(null)}
            onFocus={() => setActiveCategoryId(item.category_id)}
            onMouseEnter={() => setActiveCategoryId(item.category_id)}
            onMouseLeave={() => setActiveCategoryId(null)}
            onClick={() => onCategoryClick?.(item)}
          >
            <span className="swatch" style={{ background: item.color }} />
            <strong>{item.name}</strong>
            <span className="amount">{formatCurrency(item.amount)}</span>
            <span className="badge inactive">{item.percentText}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function buildSegments(items: CategoryPieChartItem[], total: number) {
  if (total <= 0) {
    return { gradient: "#eef2f7", rows: [] };
  }

  const sortedItems = [...items].sort((a, b) => {
    const ratioDiff = getRatioForSort(b, total) - getRatioForSort(a, total);
    if (ratioDiff !== 0) {
      return ratioDiff;
    }
    const amountDiff = b.amount - a.amount;
    if (amountDiff !== 0) {
      return amountDiff;
    }
    return a.name.localeCompare(b.name, "ja");
  });
  let cursor = 0;
  const gradientStops: string[] = [];
  const rows = sortedItems.map((item, index) => {
    const percent = (item.amount / total) * 100;
    const startPercent = cursor;
    const next = index === sortedItems.length - 1 ? 100 : cursor + percent;
    gradientStops.push(`${item.color} ${cursor}% ${next}%`);
    cursor = next;
    return {
      ...item,
      startPercent,
      endPercent: next,
      percentText: formatPercent(percent),
    };
  });

  return {
    gradient: `conic-gradient(${gradientStops.join(", ")})`,
    rows,
  };
}

function getRatioForSort(item: CategoryPieChartItem, total: number): number {
  return item.ratio ?? item.amount / total;
}

function formatPercent(percent: number): string {
  if (percent >= 10 || Number.isInteger(percent)) {
    return `${Math.round(percent)}%`;
  }
  return `${percent.toFixed(1)}%`;
}
