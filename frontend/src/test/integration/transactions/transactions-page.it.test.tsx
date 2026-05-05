import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import TransactionsPage from "@/features/transactions/transactions-page";
import type { TransactionRequest } from "@/lib/api";
import { setupIntegrationUser } from "@/test/integration/helpers";
import { fillTransactionForm, openTransactionCreateDialog } from "@/test/integration/transactions/helpers";
import { apiUrl, jsonError } from "@/test/msw/http";
import { setMockUrl } from "@/test/navigation";
import { renderWithClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { mockCategories, mockTransactions, transactionList } from "@/test/msw/fixtures";

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
    server.use(http.get(apiUrl("/api/transactions"), () => jsonError("明細一覧の取得に失敗しました。")));

    setMockUrl("/transactions?date_from=2026-05-01&date_to=2026-05-31&page=1&page_size=10");
    renderWithClient(<TransactionsPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("明細一覧の取得に失敗しました。");
  });

  it("検索条件が変わったURLで再描画すると、APIへ条件付きで再取得する", async () => {
    const requestedKeywords: string[] = [];
    server.use(
      http.get(apiUrl("/api/transactions"), ({ request }) => {
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
    setMockUrl("/transactions?keyword=%E6%9D%B1%E4%BA%AC&date_from=2026-05-01&date_to=2026-05-31&page=1&page_size=10");
    view.rerender(<TransactionsPage />);

    expect(await screen.findByText("東京メトロ")).toBeInTheDocument();
    expect(requestedKeywords).toContain("東京");
  });

  it("開始日または終了日だけを指定した場合も、反対側を自動補完しない", async () => {
    setMockUrl("/transactions?date_from=2026-05-01&page=1&page_size=10");
    const view = renderWithClient(<TransactionsPage />);

    expect(await screen.findByLabelText("開始日")).toHaveValue("2026-05-01");
    expect(screen.getByLabelText("終了日")).toHaveValue("");

    setMockUrl("/transactions?date_to=2026-05-31&page=1&page_size=10");
    view.rerender(<TransactionsPage />);

    expect(await screen.findByLabelText("終了日")).toHaveValue("2026-05-31");
    expect(screen.getByLabelText("開始日")).toHaveValue("");
  });

  it("手動追加フォームから明細を登録し、一覧へ反映する", async () => {
    const user = setupIntegrationUser();
    const transactions = [...mockTransactions];
    let submittedRequest: TransactionRequest | null = null;

    server.use(
      http.get(apiUrl("/api/transactions"), () => HttpResponse.json(transactionList(transactions))),
      http.post(apiUrl("/api/transactions"), async ({ request }) => {
        submittedRequest = await request.json() as TransactionRequest;
        const category = mockCategories.find((item) => item.category_id === submittedRequest?.category_id) ?? mockCategories[0];
        const created = {
          transaction_id: "tx-created",
          display_category_id: category.category_id,
          category_id: category.category_id,
          category_name: category.name,
          category_color: category.color,
          transaction_date: submittedRequest.transaction_date,
          shop_name: submittedRequest.shop_name,
          amount: submittedRequest.amount,
          transaction_type: "expense" as const,
          payment_method: submittedRequest.payment_method ?? null,
          card_user_name: null,
          memo: submittedRequest.memo ?? null,
          source_upload_id: null,
          source_file_name: null,
          source_row_number: null,
          source_page_number: null,
          source_format: null,
          source_hash: null,
        };
        transactions.unshift(created);
        return HttpResponse.json(created, { status: 201 });
      }),
    );
    setMockUrl("/transactions?date_from=2026-01-01&date_to=2026-12-31&page=1&page_size=10");
    renderWithClient(<TransactionsPage />);

    expect(await screen.findByText("スーパー青空")).toBeInTheDocument();
    const dialog = await openTransactionCreateDialog(user);
    await fillTransactionForm(dialog, user, {
      date: "2026-05-12",
      shopName: "IT追加店舗",
      categoryId: "cat-transport",
      amount: "1980",
      paymentMethod: "モバイル決済",
      memo: "Integration Test",
    });
    await user.click(dialog.getByRole("button", { name: "追加" }));

    expect(await screen.findByText("IT追加店舗")).toBeInTheDocument();
    expect(submittedRequest).toMatchObject({
      transaction_date: "2026-05-12",
      shop_name: "IT追加店舗",
      amount: 1980,
      category_id: "cat-transport",
      payment_method: "モバイル決済",
      memo: "Integration Test",
    });
  });

  it("同じ店名のカテゴリ一括更新を選ぶと、保存後に関連明細も更新する", async () => {
    const user = setupIntegrationUser();
    const transactions = [
      createTransactionRecord({ transaction_id: "tx-bulk-1", shop_name: "一括更新対象", category_id: "cat-food", category_name: "食費", category_color: "#f97316" }),
      createTransactionRecord({ transaction_id: "tx-bulk-2", shop_name: "一括更新対象", category_id: "cat-food", category_name: "食費", category_color: "#f97316" }),
    ];
    let sameShopUpdateRequest: { shop_name: string; category_id: string } | null = null;

    server.use(
      http.get(apiUrl("/api/transactions"), () => HttpResponse.json(transactionList(transactions))),
      http.put(apiUrl("/api/transactions/:transactionId"), async ({ params, request }) => {
        const body = await request.json() as TransactionRequest;
        const category = mockCategories.find((item) => item.category_id === body.category_id) ?? mockCategories[0];
        const index = transactions.findIndex((transaction) => transaction.transaction_id === params.transactionId);
        transactions[index] = {
          ...transactions[index],
          transaction_date: body.transaction_date,
          shop_name: body.shop_name,
          amount: body.amount,
          category_id: category.category_id,
          display_category_id: category.category_id,
          category_name: category.name,
          category_color: category.color,
          payment_method: body.payment_method ?? null,
          memo: body.memo ?? null,
        };
        return HttpResponse.json(transactions[index]);
      }),
      http.get(apiUrl("/api/transactions/:transactionId/same-shop-count"), () => HttpResponse.json({ count: 1 })),
      http.patch(apiUrl("/api/transactions/:transactionId/same-shop-category"), async ({ request }) => {
        sameShopUpdateRequest = await request.json() as { shop_name: string; category_id: string };
        const category = mockCategories.find((item) => item.category_id === sameShopUpdateRequest?.category_id) ?? mockCategories[0];
        for (const transaction of transactions) {
          if (transaction.shop_name === sameShopUpdateRequest.shop_name) {
            transaction.category_id = category.category_id;
            transaction.display_category_id = category.category_id;
            transaction.category_name = category.name;
            transaction.category_color = category.color;
          }
        }
        return HttpResponse.json({ updated_count: 1 });
      }),
    );
    setMockUrl("/transactions?date_from=2026-01-01&date_to=2026-12-31&page=1&page_size=10");
    renderWithClient(<TransactionsPage />);

    expect(await screen.findAllByText("一括更新対象")).toHaveLength(2);
    await user.click(screen.getAllByRole("button", { name: "明細を編集" })[0]);
    const dialog = within(await screen.findByRole("dialog"));
    await user.selectOptions(dialog.getByLabelText("カテゴリ"), "cat-transport");
    await user.click(dialog.getByRole("button", { name: "保存" }));
    await user.click(await screen.findByRole("button", { name: "一括更新する" }));

    expect(await screen.findAllByRole("row", { name: /一括更新対象.*交通費/ })).toHaveLength(2);
    expect(sameShopUpdateRequest).toEqual({ shop_name: "一括更新対象", category_id: "cat-transport" });
  });
});

function createTransactionRecord(
  overrides: Partial<(typeof mockTransactions)[number]> & Pick<(typeof mockTransactions)[number], "transaction_id" | "shop_name" | "category_id" | "category_name" | "category_color">,
) {
  return {
    ...mockTransactions[0],
    display_category_id: overrides.category_id,
    transaction_date: "2026-05-03",
    amount: 2480,
    payment_method: "クレジットカード",
    memo: "Integration Test",
    ...overrides,
  };
}
