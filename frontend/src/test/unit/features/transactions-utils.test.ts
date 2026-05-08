import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildFilterChips,
  buildNormalizedSearchParams,
  buildPageNumbers,
  getCategoryBadgeStyle,
  parseSearchParams,
  resolveDefaultDateRange,
} from "@/features/transactions/transactions-utils";

describe("transactions-utils", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("検索パラメータを画面用状態へ変換する", () => {
    const params = new URLSearchParams("keyword=cafe&category_id=food&page=2&page_size=20&sort_field=amount&sort_direction=asc&period=all");

    expect(parseSearchParams(params, { date_from: "2026-05-01", date_to: "2026-05-31" }, 10)).toEqual({
      keyword: "cafe",
      dateFrom: "",
      dateTo: "",
      categoryFilter: "food",
      page: 2,
      pageSize: 20,
      sortField: "amount",
      sortDirection: "asc",
    });
  });

  it("不足している検索パラメータを既定値で補完する", () => {
    const normalized = buildNormalizedSearchParams(new URLSearchParams("page_size=999&sort_field=foo"), { date_from: "2026-05-01", date_to: "2026-05-31" }, 10);

    expect(normalized.get("date_from")).toBe("2026-05-01");
    expect(normalized.get("date_to")).toBe("2026-05-31");
    expect(normalized.get("page")).toBe("1");
    expect(normalized.get("page_size")).toBe("10");
    expect(normalized.get("sort_field")).toBe("date");
    expect(normalized.get("sort_direction")).toBe("desc");
  });

  it("期間指定から既定の日付範囲を解決する", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-08T00:00:00+09:00"));

    expect(resolveDefaultDateRange(new URLSearchParams(""))).toEqual({ date_from: "2026-05-01", date_to: "2026-05-31" });
    expect(resolveDefaultDateRange(new URLSearchParams("period=previous_month"))).toEqual({ date_from: "2026-04-01", date_to: "2026-04-30" });
    expect(resolveDefaultDateRange(new URLSearchParams("period=current_year"))).toEqual({ date_from: "2026-01-01", date_to: "2026-12-31" });
    expect(resolveDefaultDateRange(new URLSearchParams("period=all"))).toEqual({ date_from: "", date_to: "" });
  });

  it("フィルタchipとページ番号を組み立てる", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-08T00:00:00+09:00"));

    expect(buildFilterChips({ dateFrom: "2026-05-01", dateTo: "2026-05-31", categoryName: "食費", query: " cafe " })).toEqual([
      "今月",
      "食費",
      "検索: cafe",
    ]);
    expect(buildPageNumbers(5, 10)).toEqual([3, 4, 5, 6, 7]);
    expect(buildPageNumbers(1, 2)).toEqual([1, 2]);
  });

  it("カテゴリbadgeの文字色を背景色から選ぶ", () => {
    expect(getCategoryBadgeStyle("#ffffff")).toMatchObject({ color: "#17233c" });
    expect(getCategoryBadgeStyle("#111827")).toMatchObject({ color: "#ffffff" });
    expect(getCategoryBadgeStyle("bad-color")).toMatchObject({ color: "#17233c" });
  });
});
