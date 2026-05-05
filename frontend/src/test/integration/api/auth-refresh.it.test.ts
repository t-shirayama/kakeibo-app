import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { getLoginPath } from "@/lib/auth";
import { api_fetch } from "@/lib/api";
import { clear_csrf_token } from "@/lib/csrf";
import { apiUrl } from "@/test/msw/http";
import { server } from "@/test/msw/server";

describe("Auth refresh integration", () => {
  it("401後にrefreshも失敗したら現在URLを戻り先にしてログインへ戻す", async () => {
    clear_csrf_token();
    window.history.replaceState({}, "", "/dashboard?month=2026-05");
    const assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, assign: assignSpy },
    });

    server.use(
      http.get(apiUrl("/api/dashboard/summary"), () =>
        HttpResponse.json({ error: { message: "Authentication is required." } }, { status: 401 }),
      ),
      http.post(apiUrl("/api/auth/refresh"), () =>
        HttpResponse.json({ error: { message: "Refresh token is required." } }, { status: 401 }),
      ),
    );

    await expect(api_fetch("/api/dashboard/summary?year=2026&month=5")).rejects.toMatchObject({ status: 401 });
    expect(assignSpy).toHaveBeenCalledWith(getLoginPath("/dashboard?month=2026-05"));
  });
});
