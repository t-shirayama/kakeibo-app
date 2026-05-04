"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Download, Save, Trash2 } from "lucide-react";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { LoadingState } from "@/components/state-block";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: api.get_settings });
  const [pageSize, setPageSize] = useState("10");
  const [dateFormat, setDateFormat] = useState("yyyy/MM/dd");
  const [darkMode, setDarkMode] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [auditAction, setAuditAction] = useState("");
  const [auditResourceType, setAuditResourceType] = useState("");
  const [auditDateFrom, setAuditDateFrom] = useState("");
  const [auditDateTo, setAuditDateTo] = useState("");
  const [auditPage, setAuditPage] = useState(1);

  useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }
    setPageSize(String(settingsQuery.data.page_size));
    setDateFormat(settingsQuery.data.date_format);
    setDarkMode(settingsQuery.data.dark_mode);
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => api.update_settings({ page_size: Number(pageSize), date_format: dateFormat, dark_mode: darkMode }),
    onSuccess: (settings) => {
      queryClient.setQueryData(["settings"], settings);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => api.delete_all_data(confirmationText),
  });
  const exportMutation = useMutation({ mutationFn: api.export_user_data });
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
        title="設定"
        subtitle="アカウント、表示、データ管理の基本設定です。"
        actions={
          <div className="toolbar">
            <button className="button secondary" type="button" onClick={() => exportMutation.mutate(undefined)} disabled={exportMutation.isPending}>
              <Download size={15} aria-hidden="true" />
              {exportMutation.isPending ? "出力中" : "データをエクスポート"}
            </button>
            <button className="button" type="button" onClick={() => saveMutation.mutate(undefined)} disabled={saveMutation.isPending || settingsQuery.isLoading}>
              <Save size={15} aria-hidden="true" />
              {saveMutation.isPending ? "保存中" : "保存"}
            </button>
          </div>
        }
      />

      <section className="card panel">
        {settingsQuery.error || saveMutation.error || deleteMutation.error || exportMutation.error ? (
          <ApiErrorAlert error={settingsQuery.error || saveMutation.error || deleteMutation.error || exportMutation.error} />
        ) : null}
        {settingsQuery.isLoading ? <LoadingState /> : null}
        {saveMutation.isSuccess ? <p className="muted">保存しました。</p> : null}
        <div className="settings-list">
          <div className="settings-row">
            <div>
              <h2>表示通貨</h2>
              <p>このアプリでは金額を整数JPYとして扱います。</p>
            </div>
            <select className="select" aria-label="表示通貨" value="JPY" disabled>
              <option>JPY</option>
            </select>
          </div>
          <div className="settings-row">
            <div>
              <h2>1ページあたりの件数</h2>
              <p>明細一覧の初期表示件数を選択します。</p>
            </div>
            <select className="select" aria-label="1ページあたりの件数" value={pageSize} onChange={(event) => setPageSize(event.target.value)}>
              <option value="10">10件</option>
              <option value="20">20件</option>
              <option value="50">50件</option>
            </select>
          </div>
          <div className="settings-row">
            <div>
              <h2>日付形式</h2>
              <p>画面表示で使う日付フォーマットです。</p>
            </div>
            <select className="select" aria-label="日付形式" value={dateFormat} onChange={(event) => setDateFormat(event.target.value)}>
              <option value="yyyy/MM/dd">YYYY/MM/DD</option>
              <option value="yyyy-MM-dd">YYYY-MM-DD</option>
            </select>
          </div>
          <div className="settings-row">
            <div>
              <h2>ダークモード</h2>
              <p>初期リリースでは設定値のみ保持し、表示切り替えは後続で対応します。</p>
            </div>
            <label className="toggle-row">
              <input type="checkbox" checked={darkMode} onChange={(event) => setDarkMode(event.target.checked)} />
              <span>設定を保存</span>
            </label>
          </div>
        </div>
      </section>

      <section className="card panel section-gap">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">監査ログ</h2>
            <p className="panel-caption">明細更新、削除、アップロード失敗などの重要操作を確認できます。</p>
          </div>
        </div>
        {auditLogsQuery.error ? <ApiErrorAlert error={auditLogsQuery.error} /> : null}
        <div className="filter-grid audit-filter-grid">
          <div className="filter-field">
            <label htmlFor="audit-action">操作種別</label>
            <input id="audit-action" className="input wide" aria-label="操作種別" value={auditAction} onChange={(event) => { setAuditAction(event.target.value); setAuditPage(1); }} list="audit-action-suggestions" />
            <datalist id="audit-action-suggestions">
              {auditActions.map((action) => (
                <option key={action} value={action} />
              ))}
            </datalist>
          </div>
          <div className="filter-field">
            <label htmlFor="audit-resource-type">対象種別</label>
            <input id="audit-resource-type" className="input wide" aria-label="対象種別" value={auditResourceType} onChange={(event) => { setAuditResourceType(event.target.value); setAuditPage(1); }} list="audit-resource-suggestions" />
            <datalist id="audit-resource-suggestions">
              {auditResourceTypes.map((resourceType) => (
                <option key={resourceType} value={resourceType} />
              ))}
            </datalist>
          </div>
          <div className="filter-field">
            <label htmlFor="audit-date-from">開始日</label>
            <input id="audit-date-from" className="input wide" type="date" aria-label="監査ログ開始日" value={auditDateFrom} onChange={(event) => { setAuditDateFrom(event.target.value); setAuditPage(1); }} />
          </div>
          <div className="filter-field">
            <label htmlFor="audit-date-to">終了日</label>
            <input id="audit-date-to" className="input wide" type="date" aria-label="監査ログ終了日" value={auditDateTo} onChange={(event) => { setAuditDateTo(event.target.value); setAuditPage(1); }} />
          </div>
        </div>

        {auditLogsQuery.isLoading ? (
          <LoadingState />
        ) : auditRows.length === 0 ? (
          <p className="calendar-panel-empty">条件に一致する監査ログはありません。</p>
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

      <section className="card panel danger-panel section-gap">
        <div className="danger-heading">
          <AlertTriangle size={20} aria-hidden="true" />
          <div>
            <h2 className="panel-title">全データ削除</h2>
            <p>明細、カテゴリ、アップロード履歴、保存済みPDF原本、ユーザー情報を削除対象にします。</p>
          </div>
        </div>
        <div className="delete-controls">
          <input
            className="input"
            aria-label="削除確認文字列"
            placeholder="DELETE と入力"
            value={confirmationText}
            onChange={(event) => setConfirmationText(event.target.value)}
          />
          <button
            className="button danger"
            type="button"
            disabled={confirmationText !== "DELETE" || deleteMutation.isPending}
            onClick={() => {
              if (window.confirm("全データを削除しますか？")) {
                deleteMutation.mutate(undefined);
              }
            }}
          >
            <Trash2 size={15} aria-hidden="true" />
            {deleteMutation.isPending ? "削除中" : "全データを削除"}
          </button>
        </div>
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
