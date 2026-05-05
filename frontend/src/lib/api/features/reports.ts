import type { ApiClient, DashboardSummaryResponse, ReportResponse } from "../types";
import { generatedApi } from "../generated";

export function createReportApi(): Pick<ApiClient, "list_category_summaries" | "get_monthly_report" | "get_dashboard_summary"> {
  return {
    async list_category_summaries(params = {}) {
      return generatedApi.list_category_summaries(params);
    },
    async get_monthly_report(params = {}) {
      return generatedApi.get_monthly_report(params) as Promise<ReportResponse>;
    },
    async get_dashboard_summary(params = {}) {
      return generatedApi.get_dashboard_summary(params) as Promise<DashboardSummaryResponse>;
    },
  };
}
