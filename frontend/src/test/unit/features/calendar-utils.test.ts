import { describe, expect, it, vi, afterEach } from "vitest";
import {
  addMonths,
  buildCalendarDays,
  buildMonthlySummary,
  getDefaultSelectedDate,
  getMonthDateRange,
  normalizeYearMonth,
} from "@/features/calendar/calendar-utils";
import type { TransactionDto } from "@/lib/types";

function transaction(overrides: Pick<TransactionDto, "transaction_date" | "transaction_type" | "amount">): TransactionDto {
  return {
    transaction_id: `txn-${overrides.transaction_date}-${overrides.transaction_type}`,
    shop_name: "テスト",
    category_id: "cat-test",
    display_category_id: null,
    category_name: null,
    category_color: null,
    payment_method: null,
    card_user_name: null,
    memo: null,
    source_upload_id: null,
    source_file_name: null,
    source_row_number: null,
    source_page_number: null,
    source_format: null,
    source_hash: null,
    ...overrides,
  };
}

describe("calendar-utils", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("対象月の範囲と月加算を計算する", () => {
    expect(getMonthDateRange("2026-02")).toEqual({ date_from: "2026-02-01", date_to: "2026-02-28" });
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
  });

  it("不正な年月をnullへ正規化する", () => {
    expect(normalizeYearMonth("2026-05")).toBe("2026-05");
    expect(normalizeYearMonth("2026/05")).toBeNull();
    expect(normalizeYearMonth(null)).toBeNull();
  });

  it("月次グリッドに祝日と日別集計を反映する", () => {
    const days = buildCalendarDays("2026-05", [
      transaction({ transaction_date: "2026-05-03", transaction_type: "expense", amount: 1200 }),
      transaction({ transaction_date: "2026-05-03", transaction_type: "income", amount: 5000 }),
    ]);

    const mayThird = days.find((day) => day.date === "2026-05-03");
    expect(days).toHaveLength(42);
    expect(mayThird).toMatchObject({
      holiday_name: "憲法記念日",
      expense_total: 1200,
      income_total: 5000,
      transaction_count: 2,
    });
  });

  it("選択日の既定値は当月の今日、なければ最新支出日、最後に月初を返す", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-08T00:00:00+09:00"));

    expect(getDefaultSelectedDate("2026-05", [])).toBe("2026-05-08");
    expect(getDefaultSelectedDate("2026-04", [transaction({ transaction_date: "2026-04-18", transaction_type: "expense", amount: 1 })])).toBe("2026-04-18");
    expect(getDefaultSelectedDate("2026-04", [])).toBe("2026-04-01");
  });

  it("月間サマリーを収入・支出・収支に分ける", () => {
    expect(
      buildMonthlySummary([
        transaction({ transaction_date: "2026-05-01", transaction_type: "income", amount: 300000 }),
        transaction({ transaction_date: "2026-05-02", transaction_type: "expense", amount: 12000 }),
      ]),
    ).toEqual({ total_income: 300000, total_expense: 12000, balance: 288000 });
  });
});
