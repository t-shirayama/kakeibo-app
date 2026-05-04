import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { ReportDashboardPage } from "../report-dashboard-page";
import { setMockUrl } from "@/test/navigation";
import { renderWithClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { dashboardSummary } from "@/test/msw/fixtures";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

describe("ReportDashboardPage integration", () => {
  it("月次サマリーAPIを結合し、KPIとカテゴリ集計を表示する", async () => {
    setMockUrl("/dashboard?month=2026-05");
    renderWithClient(<ReportDashboardPage />);

    expect((await screen.findAllByText(/260,000/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/52,800/).length).toBeGreaterThan(0);
    expect(screen.getByText("食費が支出の68%を占めています")).toBeInTheDocument();
    expect(screen.getAllByText("交通費").length).toBeGreaterThan(0);
  });

  it("月次サマリーAPIのエラーを表示する", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/dashboard/summary`, () =>
        HttpResponse.json({ error: { message: "月次サマリーの取得に失敗しました。" } }, { status: 500 }),
      ),
    );
    setMockUrl("/dashboard?month=2026-05");

    renderWithClient(<ReportDashboardPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("月次サマリーの取得に失敗しました。");
  });

  it("URLの表示月が変わると、対象月のサマリーを再取得する", async () => {
    const requestedMonths: string[] = [];
    server.use(
      http.get(`${API_BASE_URL}/api/dashboard/summary`, ({ request }) => {
        const url = new URL(request.url);
        const month = url.searchParams.get("month") ?? "";
        requestedMonths.push(month);
        return HttpResponse.json(dashboardSummary(`2026-${month.padStart(2, "0")}`));
      }),
    );
    setMockUrl("/dashboard?month=2026-05");
    const view = renderWithClient(<ReportDashboardPage />);

    expect((await screen.findAllByText(/52,800/)).length).toBeGreaterThan(0);
    setMockUrl("/dashboard?month=2026-04");
    view.rerender(<ReportDashboardPage />);

    expect((await screen.findAllByText(/42,000/)).length).toBeGreaterThan(0);
    expect(requestedMonths).toEqual(expect.arrayContaining(["5", "4"]));
  });
});
