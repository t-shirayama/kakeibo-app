export const calendarQueryKeys = {
  all: ["calendar"] as const,
  transactions: (dateFrom: string, dateTo: string) => [...calendarQueryKeys.all, "transactions", dateFrom, dateTo] as const,
};
