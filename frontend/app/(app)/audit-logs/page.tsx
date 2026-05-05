"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { EmptyState, LoadingState } from "@/components/state-block";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";

export default function AuditLogsPage() {
  const [auditAction, setAuditAction] = useState("");
  const [auditResourceType, setAuditResourceType] = useState("");
  const [auditDateFrom, setAuditDateFrom] = useState("");
  const [auditDateTo, setAuditDateTo] = useState("");
  const [auditPage, setAuditPage] = useState(1);

  const auditLogsQuery = useQuery({
    queryKey: ["audit-logs", auditAction, auditResourceType, auditDateFrom, auditDateTo, auditPage],
    queryFn: () =>
      api.list_audit_logs({
        page: auditPage,
        page_size: 10,
        action: auditAction || undefined,
        resource_type: auditResourceType || undefined,
        date_from: auditDateFrom || undefined,
        date_to: auditDateTo || undefined,
      }),
  });
  const auditTotalPages = Math.max(1, Math.ceil((auditLogsQuery.data?.total ?? 0) / 10));
  const auditRows = auditLogsQuery.data?.items ?? [];
  const auditActions = useMemo(() => Array.from(new Set(auditRows.map((item) => item.action))), [auditRows]);
  const auditResourceTypes = useMemo(() => Array.from(new Set(auditRows.map((item) => item.resource_type))), [auditRows]);

  return (
    <>
      <PageHeader
        title="監査ログ"
        subtitle="明細更新、削除、アップロード失敗などの重要操作を確認できます。"
      />

      <section className="card panel">
        {auditLogsQuery.error ? <ApiErrorAlert error={auditLogsQuery.error} /> : null}
        <div className="filter-grid audit-filter-grid">
          <div className="filter-field">
            <label htmlFor="audit-action">操作種別</label>
            <input
              id="audit-action"
              className="input wide"
              aria-label="操作種別"
              value={auditAction}
              onChange={(event) => {
                setAuditAction(event.target.value);
                setAuditPage(1);
              }}
              list="audit-action-suggestions"
            />
            <datalist id="audit-action-suggestions">
              {auditActions.map((action) => (
                <option key={action} value={action} />
              ))}
            </datalist>
          </div>
          <div className="filter-field">
            <label htmlFor="audit-resource-type">対象種別</label>
            <input
              id="audit-resource-type"
              className="input wide"
              aria-label="対象種別"
              value={auditResourceType}
              onChange={(event) => {
                setAuditResourceType(event.target.value);
                setAuditPage(1);
              }}
              list="audit-resource-suggestions"
            />
            <datalist id="audit-resource-suggestions">
              {auditResourceTypes.map((resourceType) => (
                <option key={resourceType} value={resourceType} />
              ))}
            </datalist>
          </div>
          <div className="filter-field">
            <label htmlFor="audit-date-from">開始日</label>
            <input
              id="audit-date-from"
              className="input wide"
              type="date"
              aria-label="監査ログ開始日"
              value={auditDateFrom}
              onChange={(event) => {
                setAuditDateFrom(event.target.value);
                setAuditPage(1);
              }}
            />
          </div>
          <div className="filter-field">
            <label htmlFor="audit-date-to">終了日</label>
            <input
              id="audit-date-to"
              className="input wide"
              type="date"
              aria-label="監査ログ終了日"
              value={auditDateTo}
              onChange={(event) => {
                setAuditDateTo(event.target.value);
                setAuditPage(1);
              }}
            />
          </div>
        </div>

        {auditLogsQuery.isLoading ? (
          <LoadingState />
        ) : auditRows.length === 0 ? (
          <EmptyState title="監査ログがありません" description="条件に一致する監査ログはありません。" />
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>日時</th>
                    <th>操作</th>
                    <th>対象</th>
                    <th>実行ユーザー</th>
                    <th>詳細</th>
                  </tr>
                </thead>
                <tbody>
                  {auditRows.map((row) => (
                    <tr key={row.audit_log_id}>
                      <td>{formatAuditDate(row.created_at)}</td>
                      <td>{row.action}</td>
                      <td>{row.resource_type}</td>
                      <td>{row.user_email}</td>
                      <td>{formatAuditDetails(row.details)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination-bar" aria-label="監査ログページネーション">
              <button className="button secondary compact" type="button" onClick={() => setAuditPage((value) => Math.max(1, value - 1))} disabled={auditPage <= 1}>
                前へ
              </button>
              <span className="pagination-summary">
                {auditPage} / {auditTotalPages} ページ
              </span>
              <button className="button secondary compact" type="button" onClick={() => setAuditPage((value) => Math.min(auditTotalPages, value + 1))} disabled={auditPage >= auditTotalPages}>
                次へ
              </button>
            </div>
          </>
        )}
      </section>
    </>
  );
}

function formatAuditDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

function formatAuditDetails(details: Record<string, unknown>) {
  const entries = Object.entries(details);
  if (entries.length === 0) {
    return "-";
  }
  return entries
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" / ");
}
