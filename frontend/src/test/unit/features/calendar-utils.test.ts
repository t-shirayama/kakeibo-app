import { describe, expect, it, vi, afterEach } from "vitest";
import {
  addMonths,
  buildCalendarDayAriaLabel,
  buildCalendarDays,
  buildMonthlySummary,
  formatCalendarDayMeta,
  getDefaultSelectedDate,
  getCalendarDayToneClassName,
  getCalendarWeekdayClassName,
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

  it("祝日の特例年、振替休日、国民の休日を月次グリッドへ反映する", () => {
    expect(buildCalendarDays("2019-05", []).find((day) => day.date === "2019-05-01")).toMatchObject({ holiday_name: "天皇の即位の日" });
    expect(buildCalendarDays("2020-07", []).find((day) => day.date === "2020-07-23")).toMatchObject({ holiday_name: "海の日" });
    expect(buildCalendarDays("2021-08", []).find((day) => day.date === "2021-08-08")).toMatchObject({ holiday_name: "山の日" });
    expect(buildCalendarDays("2026-09", []).find((day) => day.date === "2026-09-22")).toMatchObject({ holiday_name: "国民の休日" });
    expect(buildCalendarDays("2026-05", []).find((day) => day.date === "2026-05-06")).toMatchObject({ holiday_name: "振替休日" });
  });

  it("祝日法の過去年ルールを扱う", () => {
    expect(buildCalendarDays("1999-01", []).find((day) => day.date === "1999-01-15")).toMatchObject({ holiday_name: "成人の日" });
    expect(buildCalendarDays("2018-12", []).find((day) => day.date === "2018-12-23")).toMatchObject({ holiday_name: "天皇誕生日" });
    expect(buildCalendarDays("2006-04", []).find((day) => day.date === "2006-04-29")).toMatchObject({ holiday_name: "みどりの日" });
    expect(buildCalendarDays("2006-05", []).find((day) => day.date === "2006-05-04")).toMatchObject({ holiday_name: "国民の休日" });
    expect(buildCalendarDays("1996-07", []).find((day) => day.date === "1996-07-20")).toMatchObject({ holiday_name: "海の日" });
    expect(buildCalendarDays("1999-10", []).find((day) => day.date === "1999-10-10")).toMatchObject({ holiday_name: "体育の日" });
    expect(buildCalendarDays("1995-07", []).find((day) => day.date === "1995-07-20")?.holiday_name).toBeNull();
    expect(buildCalendarDays("1965-09", []).find((day) => day.date === "1965-09-15")?.holiday_name).toBeNull();
    expect(buildCalendarDays("1970-10", []).find((day) => day.date === "1970-10-10")).toMatchObject({ holiday_name: "体育の日" });
  });

  it("選択日の既定値は当月の今日、なければ最新支出日、最後に月初を返す", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-08T00:00:00+09:00"));

    expect(getDefaultSelectedDate("2026-05", [])).toBe("2026-05-08");
    expect(
      getDefaultSelectedDate("2026-04", [
        transaction({ transaction_date: "2026-04-03", transaction_type: "expense", amount: 1 }),
        transaction({ transaction_date: "2026-04-18", transaction_type: "expense", amount: 1 }),
      ]),
    ).toBe("2026-04-18");
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

  it("日別表示用のメタ情報、aria label、曜日クラスを作る", () => {
    const emptyDay = {
      date: "2026-05-04",
      day: 4,
      weekday: 1,
      expense_total: 0,
      income_total: 5000,
      transaction_count: 0,
      holiday_name: "みどりの日",
    };
    const expenseDay = {
      ...emptyDay,
      income_total: 0,
      transaction_count: 2,
      holiday_name: null,
    };

    expect(formatCalendarDayMeta(emptyDay)).toBe("収入あり");
    expect(formatCalendarDayMeta({ ...emptyDay, income_total: 0 })).toBe("");
    expect(formatCalendarDayMeta(expenseDay)).toBe("2件");
    expect(formatCalendarDayMeta({ ...expenseDay, income_total: 5000 })).toBe("2件 / 収入あり");
    expect(buildCalendarDayAriaLabel(emptyDay)).toBe("2026-05-04 祝日みどりの日 支出￥0 収入￥5,000");
    expect(buildCalendarDayAriaLabel(expenseDay)).toBe("2026-05-04 支出￥0 収入￥0");
    expect(getCalendarWeekdayClassName(0)).toBe("holiday");
    expect(getCalendarWeekdayClassName(6)).toBe("saturday");
    expect(getCalendarWeekdayClassName(1)).toBe("");
    expect(getCalendarDayToneClassName(emptyDay)).toBe(" holiday");
    expect(getCalendarDayToneClassName({ ...emptyDay, holiday_name: null, weekday: 6 })).toBe(" saturday");
    expect(getCalendarDayToneClassName({ ...emptyDay, holiday_name: null, weekday: 1 })).toBe("");
  });

  it("祝日法の開始前は該当祝日を付与しない", () => {
    expect(buildCalendarDays("1948-01", []).find((day) => day.date === "1948-01-15")?.holiday_name).toBeNull();
  });
});
