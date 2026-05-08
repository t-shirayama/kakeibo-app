import { formatCurrency } from "@/lib/format";
import type { DashboardSummaryDto } from "@/lib/types";

export type SummaryTone = "good" | "bad" | "neutral";
export type InsightTone = "good" | "alert" | "info";
export type InsightIconKey = "shopping" | "trend" | "saving";

export type CategoryComparisonRow = {
  category_id: string;
  name: string;
  color: string;
  current_amount: number;
  previous_amount: number;
  delta: number;
};

export type DashboardInsight = {
  title: string;
  description: string;
  tone: InsightTone;
  iconKey: InsightIconKey;
};

export function buildCategoryComparisonRows(
  current: DashboardSummaryDto["category_summaries"],
  previous: DashboardSummaryDto["category_summaries"],
): CategoryComparisonRow[] {
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

export function buildInsights(summary?: DashboardSummaryDto): DashboardInsight[] {
  if (!summary) {
    return [];
  }

  const topCategory = [...summary.category_summaries].sort((a, b) => b.amount - a.amount)[0];
  const sixMonthAverageExpense =
    summary.monthly_summaries.length > 0 ? summary.monthly_summaries.reduce((sum, month) => sum + month.total_expense, 0) / summary.monthly_summaries.length : 0;
  const expenseGap = summary.total_expense - sixMonthAverageExpense;
  const savingRate = calculateSavingsRate(summary.total_income, summary.balance);

  const insights: DashboardInsight[] = [];
  if (topCategory && topCategory.amount > 0) {
    insights.push({
      title: `${topCategory.name}が支出の${Math.round(topCategory.ratio * 100)}%を占めています`,
      description: `${topCategory.name}の支出は${formatCurrency(topCategory.amount)}です。固定費と変動費の見直し候補として確認しやすい状態です。`,
      tone: "good",
      iconKey: "shopping",
    });
  }

  insights.push({
    title: expenseGap <= 0 ? `支出合計は過去6ヶ月平均より${formatCurrency(Math.abs(Math.round(expenseGap)))}少ないです` : `支出合計は過去6ヶ月平均より${formatCurrency(Math.round(expenseGap))}多いです`,
    description: expenseGap <= 0 ? "今月は平均より支出を抑えられています。この調子で続けやすい支出項目を確認しましょう。" : "平均を上回っているため、増加要因のカテゴリを確認すると振り返りしやすくなります。",
    tone: expenseGap <= 0 ? "info" : "alert",
    iconKey: "trend",
  });

  insights.push({
    title: `貯蓄率は${savingRate.toFixed(1)}%です`,
    description: summary.total_income > 0 ? `収入${formatCurrency(summary.total_income)}に対して${formatCurrency(summary.balance)}を残せています。` : "収入が0円のため、今月の貯蓄率は0%として表示しています。",
    tone: savingRate >= 20 ? "good" : "info",
    iconKey: "saving",
  });

  return insights;
}

export function calculateSavingsRate(income: number, balance: number) {
  if (income <= 0) {
    return 0;
  }
  return (balance / income) * 100;
}

export function getExpenseTone(value: number): SummaryTone {
  if (value < 0) return "good";
  if (value > 0) return "bad";
  return "neutral";
}

export function getPositiveTone(value: number): SummaryTone {
  if (value > 0) return "good";
  if (value < 0) return "bad";
  return "neutral";
}

export function formatDelta(value: number) {
  if (value > 0) {
    return `+${formatCurrency(value)}`;
  }
  if (value < 0) {
    return `-${formatCurrency(Math.abs(value))}`;
  }
  return formatCurrency(0);
}

export function formatPointDelta(value: number) {
  if (value > 0) {
    return `+${value.toFixed(1)}pt`;
  }
  if (value < 0) {
    return `${value.toFixed(1)}pt`;
  }
  return "0.0pt";
}

export function getDeltaClassName(value: number) {
  if (value < 0) {
    return "expense-improved";
  }
  if (value > 0) {
    return "expense-worse";
  }
  return "expense-neutral";
}
