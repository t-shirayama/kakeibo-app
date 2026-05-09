export type ApiErrorShape = {
  code?: string;
  message?: string;
  details?: unknown;
  request_id?: string;
};

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

export function normalize_api_error(error: ApiErrorShape | Error | string | null | undefined): ApiErrorShape {
  if (!error) {
    return { message: "予期しないエラーが発生しました。" };
  }
  if (typeof error === "string") {
    return { message: error };
  }
  if (error instanceof ApiError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      request_id: error.request_id,
    };
  }
  if (error instanceof Error) {
    return { message: error.message || "予期しないエラーが発生しました。" };
  }
  return {
    ...error,
    message: error.message || "リクエストの処理に失敗しました。",
  };
}

export function is_api_error(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function is_csrf_error(error: unknown): boolean {
  return is_api_error(error) && error.status === 403 && error.message.includes("CSRF");
}

export function is_missing_csrf_session_error(error: unknown): boolean {
  return is_api_error(error) && error.status === 403 && error.message.includes("CSRF session is required.");
}
