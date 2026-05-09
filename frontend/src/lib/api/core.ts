import { getLoginPath } from "../auth";
import { clear_csrf_token, get_csrf_token, refresh_csrf_token } from "../csrf";
import { ApiError, type ApiErrorShape } from "./error";

export function get_api_base_url(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
}

export async function with_csrf_headers(init: RequestInit = {}): Promise<RequestInit> {
  // 変更系APIはCookie認証に加えてCSRFトークンを必ず送る。
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
  if (await should_refresh_csrf(response)) {
    // CSRF期限切れの可能性があるため、保持トークンを捨てて一度だけ再試行する。
    clear_csrf_token();
    await refresh_csrf_token();
    response = await request();
  }
  return parse(response);
}

async function should_refresh_csrf(response: Response): Promise<boolean> {
  if (response.status !== 403) {
    return false;
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return true;
  }

  try {
    const body = await response.clone().json() as {
      error?: { message?: string };
      detail?: string;
    };
    const message = body.error?.message ?? body.detail ?? "";
    return message.includes("CSRF");
  } catch {
    return true;
  }
}

export async function api_fetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await retry_after_auth_refresh(path, () =>
    retry_after_csrf_refresh(
      () => fetch(`${get_api_base_url()}${path}`, { ...init, credentials: "include" }),
      async (nextResponse) => nextResponse,
    ),
  );
  return parse_json_response<T>(response);
}

export async function api_mutation<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await retry_after_auth_refresh(path, () =>
    retry_after_csrf_refresh(
      async () => fetch(`${get_api_base_url()}${path}`, await with_csrf_headers(init)),
      async (nextResponse) => nextResponse,
    ),
  );
  return parse_json_response<T>(response);
}

export async function api_blob(path: string, init: RequestInit = {}): Promise<Blob> {
  const response = await retry_after_auth_refresh(path, () =>
    retry_after_csrf_refresh(
      async () => {
        if ((init.method ?? "GET").toUpperCase() === "GET") {
          return fetch(`${get_api_base_url()}${path}`, { ...init, credentials: "include" });
        }
        return fetch(`${get_api_base_url()}${path}`, await with_csrf_headers(init));
      },
      async (nextResponse) => nextResponse,
    ),
  );
  if (!response.ok) {
    await parse_json_response<never>(response);
  }
  return response.blob();
}

export async function refresh_auth_session(): Promise<boolean> {
  const response = await retry_after_csrf_refresh(
    async () =>
      fetch(`${get_api_base_url()}/api/auth/refresh`, await with_csrf_headers({ method: "POST" })),
    async (nextResponse) => nextResponse,
  );
  return response.ok;
}

export async function retry_after_auth_refresh(path: string, request: () => Promise<Response>): Promise<Response> {
  let response = await request();
  if (response.status !== 401 || skips_auth_redirect(path)) {
    return response;
  }

  const refreshed = await refresh_auth_session();
  if (!refreshed) {
    // リフレッシュできない場合は、現在URLを戻り先としてログインへ誘導する。
    redirect_to_login();
    return response;
  }

  response = await request();
  if (response.status === 401) {
    redirect_to_login();
  }
  return response;
}

export function skips_auth_redirect(path: string): boolean {
  return [
    "/api/auth/csrf",
    "/api/auth/login",
    "/api/auth/refresh",
    "/api/auth/password-reset",
    "/api/auth/password-reset/confirm",
  ].includes(path);
}

export function redirect_to_login(): void {
  if (typeof window === "undefined" || window.location.pathname === "/login") {
    return;
  }

  window.location.assign(getLoginPath(`${window.location.pathname}${window.location.search}`));
}

export async function parse_json_response<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await read_json_body(response) : null;
  if (!response.ok) {
    throw new ApiError(response.status, extract_error_shape(body, response.statusText));
  }
  if (body === malformedJson) {
    throw new ApiError(response.status, { message: "APIレスポンスの解析に失敗しました。" });
  }
  if (body === null) {
    return null as T;
  }
  return body as T;
}

const malformedJson = Symbol("malformed-json");

type ApiErrorEnvelope = {
  error?: ApiErrorShape;
  detail?: string;
};

async function read_json_body(response: Response): Promise<unknown | typeof malformedJson> {
  try {
    return await response.json();
  } catch {
    return malformedJson;
  }
}

function extract_error_shape(body: unknown | typeof malformedJson, fallbackMessage: string): ApiErrorShape {
  if (body === malformedJson || body === null || typeof body !== "object") {
    return { message: fallbackMessage || "APIリクエストに失敗しました。" };
  }
  const envelope = body as ApiErrorEnvelope;
  if (envelope.error) {
    return envelope.error;
  }
  if (envelope.detail) {
    return { message: envelope.detail };
  }
  return { message: fallbackMessage || "APIリクエストに失敗しました。" };
}
