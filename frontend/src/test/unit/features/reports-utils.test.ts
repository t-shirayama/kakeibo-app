import { describe, expect, it } from "vitest";
import {
  buildCategoryComparisonRows,
  buildInsights,
  calculateSavingsRate,
  formatDelta,
  formatPointDelta,
  getDeltaClassName,
  getExpenseTone,
  getPositiveTone,
} from "@/features/reports/reports-utils";
import type { DashboardSummaryDto } from "@/lib/types";

function dashboardSummary(overrides: Partial<DashboardSummaryDto> = {}): DashboardSummaryDto {
  return {
    year_month: "2026-05",
    total_expense: 120000,
    total_income: 300000,
    balance: 180000,
    transaction_count: 12,
    expense_change: 10000,
    income_change: 0,
    balance_change: -10000,
    transaction_count_change: 2,
    budget_summary: {
      total_budget: 150000,
      actual_expense: 120000,
      remaining_amount: 30000,
      progress_ratio: 0.8,
      is_over_budget: false,
      configured_category_count: 3,
    },
    category_budget_summaries: [],
    category_summaries: [
      { category_id: "food", name: "食費", color: "#ef4444", amount: 60000, ratio: 0.5 },
      { category_id: "daily", name: "日用品", color: "#22c55e", amount: 30000, ratio: 0.25 },
    ],
    monthly_summaries: [
      { period: "2026-03", total_expense: 100000, total_income: 300000, balance: 200000, transaction_count: 10 },
      { period: "2026-04", total_expense: 110000, total_income: 300000, balance: 190000, transaction_count: 11 },
    ],
    ...overrides,
  };
}

describe("reports-utils", () => {
  it("カテゴリ比較行を金額順に作り、前月差分を計算する", () => {
    expect(
      buildCategoryComparisonRows(dashboardSummary().category_summaries, [
        { category_id: "food", name: "食費", color: "#ef4444", amount: 45000, ratio: 0.4 },
      ]),
    ).toEqual([
      { category_id: "food", name: "食費", color: "#ef4444", current_amount: 60000, previous_amount: 45000, delta: 15000 },
      { category_id: "daily", name: "日用品", color: "#22c55e", current_amount: 30000, previous_amount: 0, delta: 30000 },
    ]);
  });

  it("ダッシュボードの気づきを表示用データとして作る", () => {
    const insights = buildInsights(dashboardSummary());

    expect(insights).toHaveLength(3);
    expect(insights[0]).toMatchObject({ title: "食費が支出の50%を占めています", tone: "good", iconKey: "shopping" });
    expect(insights[1]).toMatchObject({ tone: "alert", iconKey: "trend" });
    expect(insights[2]).toMatchObject({ title: "貯蓄率は60.0%です", tone: "good", iconKey: "saving" });
    expect(buildInsights(undefined)).toEqual([]);
  });

  it("カテゴリなし、収入ゼロ、平均以下の支出でも気づきを作る", () => {
    const insights = buildInsights(
      dashboardSummary({
        total_expense: 90000,
        total_income: 0,
        balance: 0,
        category_summaries: [],
        monthly_summaries: [
          { period: "2026-03", total_expense: 120000, total_income: 0, balance: 0, transaction_count: 10 },
          { period: "2026-04", total_expense: 100000, total_income: 0, balance: 0, transaction_count: 11 },
        ],
      }),
    );

    expect(insights).toHaveLength(2);
    expect(insights[0]).toMatchObject({ tone: "info", iconKey: "trend" });
    expect(insights[1]).toMatchObject({
      title: "貯蓄率は0.0%です",
      description: "収入が0円のため、今月の貯蓄率は0%として表示しています。",
      tone: "info",
    });

    expect(
      buildInsights(
        dashboardSummary({
          total_expense: 1,
          total_income: 1,
          balance: 0,
          category_summaries: [],
          monthly_summaries: [],
        }),
      )[0],
    ).toMatchObject({ tone: "alert", iconKey: "trend" });
  });

  it("前月比と貯蓄率の表示用値を返す", () => {
    expect(calculateSavingsRate(300000, 45000)).toBe(15);
    expect(calculateSavingsRate(0, 45000)).toBe(0);
    expect(formatDelta(1200)).toBe("+￥1,200");
    expect(formatDelta(-1200)).toBe("-￥1,200");
    expect(formatDelta(0)).toBe("￥0");
    expect(formatPointDelta(1.25)).toBe("+1.3pt");
    expect(formatPointDelta(-1.25)).toBe("-1.3pt");
    expect(formatPointDelta(0)).toBe("0.0pt");
  });

  it("増減のtoneとclass名を返す", () => {
    expect(getExpenseTone(-1)).toBe("good");
    expect(getExpenseTone(1)).toBe("bad");
    expect(getExpenseTone(0)).toBe("neutral");
    expect(getPositiveTone(1)).toBe("good");
    expect(getPositiveTone(-1)).toBe("bad");
    expect(getPositiveTone(0)).toBe("neutral");
    expect(getDeltaClassName(-1)).toBe("expense-improved");
    expect(getDeltaClassName(1)).toBe("expense-worse");
    expect(getDeltaClassName(0)).toBe("expense-neutral");
  });
});
