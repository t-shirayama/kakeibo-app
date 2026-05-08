import { describe, expect, it } from "vitest";
import { ApiError, is_api_error, is_csrf_error, is_missing_csrf_session_error, normalize_api_error } from "@/lib/api";
import { parse_json_response } from "@/lib/api/core";

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("API error handling", () => {
  it("ApiError preserves backend common error metadata", () => {
    const error = new ApiError(404, {
      code: "http_404",
      message: "Category not found.",
      details: { category_id: "missing" },
      request_id: "request-1",
    });

    expect(error.name).toBe("ApiError");
    expect(error.status).toBe(404);
    expect(error.message).toBe("Category not found.");
    expect(error.code).toBe("http_404");
    expect(error.details).toEqual({ category_id: "missing" });
    expect(error.request_id).toBe("request-1");
  });

  it("ApiError falls back to a generic message when backend message is empty", () => {
    expect(new ApiError(500, {}).message).toBe("APIリクエストに失敗しました。");
  });

  it("normalizes api errors without losing request metadata", () => {
    const normalized = normalize_api_error(new ApiError(500, { code: "http_500", message: "Failed.", request_id: "req-1" }));

    expect(normalized).toEqual({
      code: "http_500",
      message: "Failed.",
      details: undefined,
      request_id: "req-1",
    });
  });

  it("normalizes unknown, string, Error, and partial backend error shapes", () => {
    expect(normalize_api_error(null).message).toBe("予期しないエラーが発生しました。");
    expect(normalize_api_error("失敗しました。").message).toBe("失敗しました。");
    expect(normalize_api_error(new Error("通常の例外")).message).toBe("通常の例外");
    expect(normalize_api_error(new Error()).message).toBe("予期しないエラーが発生しました。");
    expect(normalize_api_error({ code: "bad_request" })).toEqual({
      code: "bad_request",
      message: "リクエストの処理に失敗しました。",
    });
  });

  it("detects api, csrf, and missing csrf session errors", () => {
    const csrf = new ApiError(403, { message: "CSRF token has expired." });
    const missingSession = new ApiError(403, { message: "CSRF session is required." });
    const auth = new ApiError(401, { message: "Authentication is required." });

    expect(is_api_error(csrf)).toBe(true);
    expect(is_api_error(new Error("plain"))).toBe(false);
    expect(is_csrf_error(csrf)).toBe(true);
    expect(is_csrf_error(auth)).toBe(false);
    expect(is_missing_csrf_session_error(missingSession)).toBe(true);
    expect(is_missing_csrf_session_error(csrf)).toBe(false);
  });

  it("parses successful json responses", async () => {
    await expect(parse_json_response<{ status: string }>(jsonResponse({ status: "ok" }))).resolves.toEqual({ status: "ok" });
  });

  it("wraps backend error envelopes into ApiError", async () => {
    await expect(
      parse_json_response(jsonResponse({ error: { code: "http_404", message: "Not found.", request_id: "req-1" } }, { status: 404 })),
    ).rejects.toMatchObject({
      status: 404,
      code: "http_404",
      message: "Not found.",
      request_id: "req-1",
    });
  });

  it("uses detail and status text fallback when error envelope is absent", async () => {
    await expect(parse_json_response(jsonResponse({ detail: "Invalid input." }, { status: 400 }))).rejects.toMatchObject({
      status: 400,
      message: "Invalid input.",
    });

    await expect(parse_json_response(new Response("broken", { status: 502, statusText: "Bad Gateway" }))).rejects.toMatchObject({
      status: 502,
      message: "Bad Gateway",
    });
  });

  it("turns malformed successful json into an ApiError", async () => {
    const response = new Response("{", {
      status: 200,
      headers: { "content-type": "application/json" },
    });

    await expect(parse_json_response(response)).rejects.toMatchObject({
      status: 200,
      message: "APIレスポンスの解析に失敗しました。",
    });
  });
});
