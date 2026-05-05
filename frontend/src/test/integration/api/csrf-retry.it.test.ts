import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { api_mutation } from "@/lib/api";
import { apiUrl } from "@/test/msw/http";
import { server } from "@/test/msw/server";

describe("CSRF retry integration", () => {
  it("CSRFエラー時はトークンを再取得して変更系APIを一度だけ再試行する", async () => {
    let csrfFetchCount = 0;
    const receivedTokens: string[] = [];

    server.use(
      http.get(apiUrl("/api/auth/csrf"), () => {
        csrfFetchCount += 1;
        return HttpResponse.json({ csrf_token: `retry-token-${csrfFetchCount}` });
      }),
      http.post(apiUrl("/api/test-csrf-retry"), ({ request }) => {
        receivedTokens.push(request.headers.get("x-csrf-token") ?? "");
        if (receivedTokens.length === 1) {
          return HttpResponse.json({ error: { message: "CSRF session is required." } }, { status: 403 });
        }
        return HttpResponse.json({ status: "ok" });
      }),
    );

    await expect(api_mutation<{ status: string }>("/api/test-csrf-retry", { method: "POST" })).resolves.toEqual({ status: "ok" });
    expect(csrfFetchCount).toBe(2);
    expect(receivedTokens).toEqual(["retry-token-1", "retry-token-2"]);
  });
});
