import { AlertTriangle } from "lucide-react";
import { normalize_api_error, type ApiErrorShape } from "@/lib/api/error";

type ApiErrorAlertProps = {
  error?: ApiErrorShape | Error | string | null;
  title?: string;
  onRetry?: () => void;
};

export function ApiErrorAlert({ error, title = "APIエラー", onRetry }: ApiErrorAlertProps) {
  const normalized = normalize_api_error(error);

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
