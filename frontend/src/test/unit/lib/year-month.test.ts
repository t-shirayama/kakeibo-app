import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addMonths,
  formatDateLabel,
  formatDateParam,
  formatYearMonthLabel,
  getCurrentYearMonth,
  getMonthDateRange,
  getTodayDateString,
  isDateInYearMonth,
  normalizeYearMonth,
  parseYearMonth,
} from "@/lib/year-month";

describe("year-month", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("現在年月と今日の日付を日本時間で返す", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-08T00:00:00+09:00"));

    expect(getCurrentYearMonth()).toBe("2026-05");
    expect(getTodayDateString()).toBe("2026-05-08");
  });

  it("年月をparseし、不正値は現在年月へfallbackする", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-08T00:00:00+09:00"));

    expect(parseYearMonth("2026-12")).toEqual({ year: 2026, month: 12 });
    expect(parseYearMonth("invalid")).toEqual({ year: 2026, month: 5 });
  });

  it("年月の正規化、月加算、月初月末を扱う", () => {
    expect(normalizeYearMonth("2026-05")).toBe("2026-05");
    expect(normalizeYearMonth("2026/05")).toBeNull();
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(getMonthDateRange("2026-02")).toEqual({ date_from: "2026-02-01", date_to: "2026-02-28" });
  });

  it("表示用ラベルと日付文字列を組み立てる", () => {
    expect(formatYearMonthLabel("2026-05")).toBe("2026年5月");
    expect(formatDateLabel("2026-05-18")).toBe("2026年5月18日");
    expect(formatDateParam(new Date(2026, 4, 8))).toBe("2026-05-08");
    expect(isDateInYearMonth("2026-05-08", "2026-05")).toBe(true);
    expect(isDateInYearMonth("2026-04-30", "2026-05")).toBe(false);
  });
});
