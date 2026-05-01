import type { CategoryDto, TransactionDto } from "./types";
import { categories, recentTransactions } from "./mock-data";
import { clear_csrf_token, get_csrf_token } from "./csrf";
import type { ApiErrorShape } from "@/components/api-error-alert";

export type ApiClient = {
  list_transactions: () => Promise<TransactionDto[]>;
  list_categories: () => Promise<CategoryDto[]>;
};

export class ApiError extends Error {
  readonly code?: string;
  readonly details?: unknown;
  readonly request_id?: string;
  readonly status: number;

  constructor(status: number, error: ApiErrorShape) {
    super(error.message || "APIリクエストに失敗しました。");
    this.name = "ApiError";
    this.status = status;
    this.code = error.code;
    this.details = error.details;
    this.request_id = error.request_id;
  }
}

export async function with_csrf_headers(init: RequestInit = {}): Promise<RequestInit> {
  const headers = new Headers(init.headers);
  headers.set("X-CSRF-Token", await get_csrf_token());

  return {
    ...init,
    credentials: "include",
    headers,
  };
}

export async function api_fetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await retry_after_csrf_refresh(
    () => fetch(`${get_api_base_url()}${path}`, { ...init, credentials: "include" }),
    async (nextResponse) => nextResponse,
  );
  return parse_json_response<T>(response);
}

export async function api_mutation<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await retry_after_csrf_refresh(
    async () => fetch(`${get_api_base_url()}${path}`, await with_csrf_headers(init)),
    async (nextResponse) => nextResponse,
  );
  return parse_json_response<T>(response);
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

async function parse_json_response<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : null;
  if (!response.ok) {
    throw new ApiError(response.status, body?.error ?? { message: response.statusText });
  }
  return body as T;
}

function get_api_base_url(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
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
