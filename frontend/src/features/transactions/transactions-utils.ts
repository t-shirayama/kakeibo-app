import type { CSSProperties } from "react";
import { formatDateParam } from "@/lib/year-month";

export type SortField = "date" | "amount";
export type SortDirection = "asc" | "desc";
export type DateRange = { date_from: string; date_to: string };
export type SearchParamsLike = Pick<URLSearchParams, "get" | "toString">;

const SORT_FIELDS = new Set(["date", "amount"]);
const SORT_DIRECTIONS = new Set(["asc", "desc"]);

export type TransactionSearchParams = {
  keyword: string;
  dateFrom: string;
  dateTo: string;
  categoryFilter: string;
  page: number;
  pageSize: number;
  sortField: SortField;
  sortDirection: SortDirection;
};

export function parseSearchParams(
  searchParams: SearchParamsLike,
  defaultDateRange: DateRange,
  defaultPageSize: number,
): TransactionSearchParams {
  const sortField = searchParams.get("sort_field") === "amount" ? "amount" : "date";
  const sortDirection = searchParams.get("sort_direction") === "asc" ? "asc" : "desc";
  const parsedPage = Number(searchParams.get("page") ?? "1");
  const parsedPageSize = Number(searchParams.get("page_size") ?? String(defaultPageSize));
  const explicitDateFrom = searchParams.get("date_from");
  const explicitDateTo = searchParams.get("date_to");
  const hasExplicitDateFilter = explicitDateFrom !== null || explicitDateTo !== null || searchParams.get("period") === "all";
  return {
    keyword: searchParams.get("keyword") ?? "",
    dateFrom: hasExplicitDateFilter ? explicitDateFrom ?? "" : defaultDateRange.date_from,
    dateTo: hasExplicitDateFilter ? explicitDateTo ?? "" : defaultDateRange.date_to,
    categoryFilter: searchParams.get("category_id") ?? "",
    page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    pageSize: [10, 20, 50].includes(parsedPageSize) ? parsedPageSize : defaultPageSize,
    sortField,
    sortDirection,
  };
}

export function buildNormalizedSearchParams(
  searchParams: SearchParamsLike,
  defaultDateRange: DateRange,
  defaultPageSize: number,
) {
  const normalized = new URLSearchParams(searchParams.toString());
  const hasExplicitDateFilter =
    normalized.has("date_from") || normalized.has("date_to") || normalized.get("period") === "all";
  if (!hasExplicitDateFilter && !normalized.get("date_from")) {
    normalized.set("date_from", defaultDateRange.date_from);
  }
  if (!hasExplicitDateFilter && !normalized.get("date_to")) {
    normalized.set("date_to", defaultDateRange.date_to);
  }
  if (!normalized.get("page")) {
    normalized.set("page", "1");
  }
  const pageSize = Number(normalized.get("page_size") ?? String(defaultPageSize));
  normalized.set("page_size", String([10, 20, 50].includes(pageSize) ? pageSize : defaultPageSize));
  if (!SORT_FIELDS.has(String(normalized.get("sort_field")))) {
    normalized.set("sort_field", "date");
  }
  if (!SORT_DIRECTIONS.has(String(normalized.get("sort_direction")))) {
    normalized.set("sort_direction", "desc");
  }
  return normalized;
}

export function resolveDefaultDateRange(searchParams: SearchParamsLike) {
  const explicitFrom = searchParams.get("date_from");
  const explicitTo = searchParams.get("date_to");
  if (isDateParam(explicitFrom) && isDateParam(explicitTo)) {
    return { date_from: explicitFrom, date_to: explicitTo };
  }

  const period = searchParams.get("period");
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  if (period === "all") {
    return { date_from: "", date_to: "" };
  }
  if (period === "previous_month") {
    const previousMonth = new Date(year, month - 1, 1);
    return {
      date_from: formatDateParam(new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1)),
      date_to: formatDateParam(new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0)),
    };
  }
  if (period === "current_year") {
    return {
      date_from: formatDateParam(new Date(year, 0, 1)),
      date_to: formatDateParam(new Date(year, 11, 31)),
    };
  }

  return {
    date_from: formatDateParam(new Date(year, month, 1)),
    date_to: formatDateParam(new Date(year, month + 1, 0)),
  };
}

export function setOrDelete(searchParams: URLSearchParams, key: string, value: string) {
  if (!value) {
    searchParams.delete(key);
    return;
  }
  searchParams.set(key, value);
}

export function sortDirectionLabel(direction: SortDirection) {
  return direction === "asc" ? "昇順" : "降順";
}

export function sortLabel(field: SortField, direction: SortDirection) {
  return `${field === "date" ? "日付" : "金額"} ${sortDirectionLabel(direction)}`;
}

export function buildFilterChips({ dateFrom, dateTo, categoryName, query }: { dateFrom: string; dateTo: string; categoryName?: string; query: string }) {
  const chips: string[] = [];
  if (dateFrom || dateTo) {
    chips.push(formatDateRangeChip(dateFrom, dateTo));
  }
  if (categoryName) {
    chips.push(categoryName);
  }
  if (query.trim()) {
    chips.push(`検索: ${query.trim()}`);
  }
  return chips;
}

export function buildPageNumbers(currentPage: number, totalPages: number) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  const pages: number[] = [];
  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }
  return pages;
}

export function getCategoryBadgeStyle(backgroundColor: string): CSSProperties {
  return {
    backgroundColor,
    borderColor: backgroundColor,
    color: getReadableTextColor(backgroundColor),
  };
}

export function getReadableTextColor(hexColor: string): "#17233c" | "#ffffff" {
  const normalized = hexColor.replace("#", "");
  if (!/^[\da-f]{6}$/i.test(normalized)) {
    return "#17233c";
  }

  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.62 ? "#17233c" : "#ffffff";
}

function isDateParam(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function formatDateRangeChip(dateFrom: string, dateTo: string) {
  const currentMonth = getCurrentMonthRange();
  if (dateFrom === currentMonth.date_from && dateTo === currentMonth.date_to) {
    return "今月";
  }
  if (dateFrom && dateTo) {
    return `${dateFrom} - ${dateTo}`;
  }
  return dateFrom ? `${dateFrom}以降` : `${dateTo}まで`;
}

function getCurrentMonthRange() {
  const today = new Date();
  return {
    date_from: formatDateParam(new Date(today.getFullYear(), today.getMonth(), 1)),
    date_to: formatDateParam(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  };
}
