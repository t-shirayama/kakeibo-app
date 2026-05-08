export type YearMonth = {
  year: number;
  month: number;
};

export type DateRange = {
  date_from: string;
  date_to: string;
};

export function getCurrentYearMonth() {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const fallbackDate = new Date();
  const year = parts.find((part) => part.type === "year")?.value ?? String(fallbackDate.getFullYear());
  const month = parts.find((part) => part.type === "month")?.value ?? String(fallbackDate.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

export function getTodayDateString() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "2000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

export function parseYearMonth(value: string): YearMonth {
  const [year, month] = value.split("-").map(Number);
  const currentYearMonth = getCurrentYearMonth();

  return {
    year: Number.isInteger(year) ? year : Number(currentYearMonth.slice(0, 4)),
    month: Number.isInteger(month) ? month : Number(currentYearMonth.slice(5, 7)),
  };
}

export function normalizeYearMonth(value: string | null) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return null;
  }
  return value;
}

export function addMonths(value: string, amount: number) {
  const { year, month } = parseYearMonth(value);
  const date = new Date(year, month - 1 + amount, 1);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthDateRange(value: string): DateRange {
  const { year, month } = parseYearMonth(value);
  const lastDay = new Date(year, month, 0).getDate();
  const paddedMonth = String(month).padStart(2, "0");

  return {
    date_from: `${year}-${paddedMonth}-01`,
    date_to: `${year}-${paddedMonth}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function formatYearMonthLabel(value: string) {
  const { year, month } = parseYearMonth(value);

  return `${year}年${month}月`;
}

export function formatDateLabel(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

export function isDateInYearMonth(date: string, yearMonth: string) {
  return date.startsWith(`${yearMonth}-`);
}

export function formatDateParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
