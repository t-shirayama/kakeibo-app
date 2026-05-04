import type { ApiErrorShape } from "@/components/api-error-alert";

export class ApiError extends Error {
  // バックエンド共通エラー形式を画面で扱いやすいErrorへ包む。
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
