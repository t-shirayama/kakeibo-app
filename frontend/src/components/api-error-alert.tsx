import { AlertTriangle } from "lucide-react";

export type ApiErrorShape = {
  code?: string;
  message?: string;
  details?: unknown;
  request_id?: string;
};

type ApiErrorAlertProps = {
  error?: ApiErrorShape | Error | string | null;
  title?: string;
  onRetry?: () => void;
};

function normalizeError(error: ApiErrorAlertProps["error"]): ApiErrorShape {
  if (!error) {
    return { message: "予期しないエラーが発生しました。" };
  }
  if (typeof error === "string") {
    return { message: error };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return error;
}

export function ApiErrorAlert({ error, title = "APIエラー", onRetry }: ApiErrorAlertProps) {
  const normalized = normalizeError(error);

  return (
    <div className="api-error-alert" role="alert">
      <AlertTriangle size={18} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{normalized.message || "リクエストの処理に失敗しました。"}</p>
        <div className="api-error-meta">
          {normalized.code ? <span>code: {normalized.code}</span> : null}
          {normalized.request_id ? <span>request_id: {normalized.request_id}</span> : null}
        </div>
      </div>
      {onRetry ? (
        <button className="button secondary compact" type="button" onClick={onRetry}>
          再試行
        </button>
      ) : null}
    </div>
  );
}
