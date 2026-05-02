const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

let csrfToken: string | null = null;

type CsrfTokenResponse = {
  csrf_token: string;
};

export async function get_csrf_token(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }

  // CSRFトークンはCookieへ保存せず、フロントのメモリにだけ保持する。
  const response = await fetch(`${API_BASE_URL}/api/auth/csrf`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch CSRF token.");
  }

  const body = (await response.json()) as CsrfTokenResponse;
  csrfToken = body.csrf_token;
  return csrfToken;
}

export function clear_csrf_token(): void {
  // 403時は期限切れの可能性があるため、次回リクエストで取り直せるようにする。
  csrfToken = null;
}
