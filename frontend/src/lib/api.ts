import type { CategoryDto, TransactionDto } from "./types";
import { categories, recentTransactions } from "./mock-data";
import { clear_csrf_token, get_csrf_token } from "./csrf";

export type ApiClient = {
  list_transactions: () => Promise<TransactionDto[]>;
  list_categories: () => Promise<CategoryDto[]>;
};

export async function with_csrf_headers(init: RequestInit = {}): Promise<RequestInit> {
  const headers = new Headers(init.headers);
  headers.set("X-CSRF-Token", await get_csrf_token());

  return {
    ...init,
    credentials: "include",
    headers,
  };
}

export async function retry_after_csrf_refresh<T>(
  request: () => Promise<Response>,
  parse: (response: Response) => Promise<T>,
): Promise<T> {
  let response = await request();
  if (response.status === 403) {
    clear_csrf_token();
    response = await request();
  }
  return parse(response);
}

// Replace these mock adapters with imports from src/lib/generated once OpenAPI generation is wired.
export const api: ApiClient = {
  async list_transactions() {
    return recentTransactions;
  },
  async list_categories() {
    return categories;
  },
};
