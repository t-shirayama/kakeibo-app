import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import TransactionsPage from "../transactions-page";
import { getMockRouter, setMockUrl } from "@/test/navigation";
import { renderWithClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { mockTransactions, transactionList } from "@/test/msw/fixtures";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

describe("TransactionsPage integration", () => {
  it("設定・カテゴリ・明細APIを結合し、明細一覧を表示する", async () => {
    setMockUrl("/transactions?date_from=2026-05-01&date_to=2026-05-31&page=1&page_size=10");
    renderWithClient(<TransactionsPage />);

    expect(await screen.findByText("スーパー青空")).toBeInTheDocument();
    expect(screen.getAllByText("食費").length).toBeGreaterThan(0);
    expect(screen.getByText(/2,480/)).toBeInTheDocument();
    expect(screen.getByText("2件ヒット")).toBeInTheDocument();
  });

  it("明細APIのエラーを表示する", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/transactions`, () =>
        HttpResponse.json({ error: { message: "明細一覧の取得に失敗しました。" } }, { status: 500 }),
      ),
    );
    setMockUrl("/transactions?date_from=2026-05-01&date_to=2026-05-31&page=1&page_size=10");

    renderWithClient(<TransactionsPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("明細一覧の取得に失敗しました。");
  });

  it("検索条件が変わったURLで再描画すると、APIへ条件付きで再取得する", async () => {
    const requestedKeywords: string[] = [];
    server.use(
      http.get(`${API_BASE_URL}/api/transactions`, ({ request }) => {
        const url = new URL(request.url);
        requestedKeywords.push(url.searchParams.get("keyword") ?? "");
        const keyword = url.searchParams.get("keyword");
        const items = keyword ? mockTransactions.filter((transaction) => transaction.shop_name.includes(keyword)) : mockTransactions;
        return HttpResponse.json(transactionList(items));
      }),
    );
    setMockUrl("/transactions?date_from=2026-05-01&date_to=2026-05-31&page=1&page_size=10");
    const view = renderWithClient(<TransactionsPage />);

    expect(await screen.findByText("スーパー青空")).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("明細検索"));
    await userEvent.keyboard("東京");

    await waitFor(() => expect(getMockRouter().replace).toHaveBeenCalled());
    setMockUrl("/transactions?keyword=%E6%9D%B1%E4%BA%AC&date_from=2026-05-01&date_to=2026-05-31&page=1&page_size=10");
    view.rerender(<TransactionsPage />);

    expect(await screen.findByText("東京メトロ")).toBeInTheDocument();
    expect(requestedKeywords).toContain("東京");
  });
});
