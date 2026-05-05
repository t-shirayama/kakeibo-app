export const reportsQueryKeys = {
  all: ["reports"] as const,
  dashboardSummaries: () => [...reportsQueryKeys.all, "dashboard-summary"] as const,
  dashboardSummary: (year: number, month: number) => [...reportsQueryKeys.dashboardSummaries(), year, month] as const,
};
