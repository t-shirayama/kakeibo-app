export function addMonths(value: string, amount: number) {
  const { year, month } = parseYearMonth(value);
  const date = new Date(year, month - 1 + amount, 1);
  const nextValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

  return {
    ...parseYearMonth(nextValue),
    value: nextValue,
    label: `${date.getFullYear()}年${date.getMonth() + 1}月`,
  };
}

export function parseYearMonth(value: string) {
  const [year, month] = value.split("-").map(Number);

  return { year, month };
}

export function getMonthDateRange(value: string) {
  const { year, month } = parseYearMonth(value);
  const lastDay = new Date(year, month, 0).getDate();
  const paddedMonth = String(month).padStart(2, "0");

  return {
    date_from: `${year}-${paddedMonth}-01`,
    date_to: `${year}-${paddedMonth}-${String(lastDay).padStart(2, "0")}`,
  };
}
