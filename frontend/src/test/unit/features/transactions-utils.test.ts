import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildFilterChips,
  buildNormalizedSearchParams,
  buildPageNumbers,
  getCategoryBadgeStyle,
  parseSearchParams,
  resolveDefaultDateRange,
  setOrDelete,
  sortDirectionLabel,
  sortLabel,
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

    expect(parseSearchParams(new URLSearchParams("page=0&page_size=13"), { date_from: "2026-05-01", date_to: "2026-05-31" }, 10)).toMatchObject({
      page: 1,
      pageSize: 10,
      sortField: "date",
      sortDirection: "desc",
    });
    expect(parseSearchParams(new URLSearchParams(""), { date_from: "2026-05-01", date_to: "2026-05-31" }, 20)).toMatchObject({
      page: 1,
      pageSize: 20,
      dateFrom: "2026-05-01",
      dateTo: "2026-05-31",
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

    const explicit = buildNormalizedSearchParams(
      new URLSearchParams("date_from=2026-04-01&date_to=2026-04-30&page=2&page_size=20&sort_field=amount&sort_direction=asc"),
      { date_from: "2026-05-01", date_to: "2026-05-31" },
      10,
    );
    expect(explicit.toString()).toBe("date_from=2026-04-01&date_to=2026-04-30&page=2&page_size=20&sort_field=amount&sort_direction=asc");
    expect(
      buildNormalizedSearchParams(new URLSearchParams("page=3&sort_field=date&sort_direction=desc"), { date_from: "2026-05-01", date_to: "2026-05-31" }, 50).toString(),
    ).toBe("page=3&sort_field=date&sort_direction=desc&date_from=2026-05-01&date_to=2026-05-31&page_size=50");
    const missingSort = buildNormalizedSearchParams(new URLSearchParams("sort_direction=sideways"), { date_from: "2026-05-01", date_to: "2026-05-31" }, 10);
    expect(missingSort.get("sort_field")).toBe("date");
    expect(missingSort.get("sort_direction")).toBe("desc");
  });

  it("期間指定から既定の日付範囲を解決する", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-08T00:00:00+09:00"));

    expect(resolveDefaultDateRange(new URLSearchParams(""))).toEqual({ date_from: "2026-05-01", date_to: "2026-05-31" });
    expect(resolveDefaultDateRange(new URLSearchParams("period=previous_month"))).toEqual({ date_from: "2026-04-01", date_to: "2026-04-30" });
    expect(resolveDefaultDateRange(new URLSearchParams("period=current_year"))).toEqual({ date_from: "2026-01-01", date_to: "2026-12-31" });
    expect(resolveDefaultDateRange(new URLSearchParams("period=all"))).toEqual({ date_from: "", date_to: "" });
    expect(resolveDefaultDateRange(new URLSearchParams("date_from=2026-02-01&date_to=2026-02-28"))).toEqual({ date_from: "2026-02-01", date_to: "2026-02-28" });
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
    expect(buildFilterChips({ dateFrom: "2026-04-01", dateTo: "2026-04-30", query: "", categoryName: undefined })).toEqual([
      "2026-04-01 - 2026-04-30",
    ]);
    expect(buildFilterChips({ dateFrom: "2026-05-01", dateTo: "", query: "", categoryName: undefined })).toEqual(["2026-05-01以降"]);
    expect(buildFilterChips({ dateFrom: "", dateTo: "2026-05-31", query: "", categoryName: undefined })).toEqual(["2026-05-31まで"]);
    expect(buildFilterChips({ dateFrom: "", dateTo: "", query: "", categoryName: undefined })).toEqual([]);
  });

  it("カテゴリbadgeの文字色を背景色から選ぶ", () => {
    expect(getCategoryBadgeStyle("#ffffff")).toMatchObject({ color: "#17233c" });
    expect(getCategoryBadgeStyle("#111827")).toMatchObject({ color: "#ffffff" });
    expect(getCategoryBadgeStyle("bad-color")).toMatchObject({ color: "#17233c" });
  });

  it("URLSearchParams更新とソート表示ラベルを作る", () => {
    const params = new URLSearchParams("keyword=cafe");
    setOrDelete(params, "keyword", "");
    setOrDelete(params, "category_id", "food");

    expect(params.toString()).toBe("category_id=food");
    expect(sortDirectionLabel("asc")).toBe("昇順");
    expect(sortDirectionLabel("desc")).toBe("降順");
    expect(sortLabel("date", "desc")).toBe("日付 降順");
    expect(sortLabel("amount", "asc")).toBe("金額 昇順");
  });
});
