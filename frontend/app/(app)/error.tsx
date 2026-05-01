"use client";

import { ApiErrorAlert } from "@/components/api-error-alert";
import { StateBlock } from "@/components/state-block";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="error-stack">
      <ApiErrorAlert error={{ message: error.message, request_id: error.digest }} title="画面の読み込みに失敗しました" onRetry={reset} />
      <StateBlock title="もう一度お試しください" description="問題が続く場合は時間をおいて再度アクセスしてください。" variant="error" />
    </div>
  );
}
