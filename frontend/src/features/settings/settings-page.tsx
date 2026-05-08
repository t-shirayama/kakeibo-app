"use client";

import { type ReactNode, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Download, Save, Trash2 } from "lucide-react";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { MessageDialog, type MessageDialogAction } from "@/components/message-dialog";
import { LoadingState } from "@/components/state-block";
import { PageHeader } from "@/components/page-header";
import { settingsQueryKeys } from "@/features/settings/queryKeys";
import { api } from "@/lib/api";

type MessageDialogState = {
  title: string;
  description: ReactNode;
  actions: MessageDialogAction[];
  tone?: "info" | "danger";
  onAction: (actionId: string) => void;
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: settingsQueryKeys.current(), queryFn: api.get_settings });
  const [draftSettings, setDraftSettings] = useState<{
    pageSize?: string;
    dateFormat?: string;
    darkMode?: boolean;
  }>({});
  const [confirmationText, setConfirmationText] = useState("");
  const [messageDialog, setMessageDialog] = useState<MessageDialogState | null>(null);
  const pageSize = draftSettings.pageSize ?? String(settingsQuery.data?.page_size ?? 10);
  const dateFormat = draftSettings.dateFormat ?? settingsQuery.data?.date_format ?? "yyyy/MM/dd";
  const darkMode = draftSettings.darkMode ?? settingsQuery.data?.dark_mode ?? false;

  const saveMutation = useMutation({
    mutationFn: () => api.update_settings({ page_size: Number(pageSize), date_format: dateFormat, dark_mode: darkMode }),
    onSuccess: (settings) => {
      queryClient.setQueryData(settingsQueryKeys.current(), settings);
      setDraftSettings({});
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => api.delete_all_data(confirmationText),
  });
  const exportMutation = useMutation({ mutationFn: api.export_user_data });

  function showMessageDialog(options: Omit<MessageDialogState, "onAction">): Promise<string> {
    return new Promise((resolve) => {
      setMessageDialog({
        ...options,
        onAction: (actionId) => {
          setMessageDialog(null);
          resolve(actionId);
        },
      });
    });
  }

  async function handleDeleteAllData() {
    const action = await showMessageDialog({
      title: "全データを削除しますか？",
      description: <p>明細、未分類以外のカテゴリ、アップロード履歴、収入設定、保存済みPDF原本が削除されます。</p>,
      tone: "danger",
      actions: [
        { id: "cancel", label: "キャンセル", variant: "secondary" },
        { id: "delete", label: "削除する", variant: "danger" },
      ],
    });
    if (action === "delete") {
      deleteMutation.mutate(undefined);
    }
  }

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
            <select className="select" aria-label="1ページあたりの件数" value={pageSize} onChange={(event) => setDraftSettings((current) => ({ ...current, pageSize: event.target.value }))}>
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
            <select className="select" aria-label="日付形式" value={dateFormat} onChange={(event) => setDraftSettings((current) => ({ ...current, dateFormat: event.target.value }))}>
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
              <input type="checkbox" checked={darkMode} onChange={(event) => setDraftSettings((current) => ({ ...current, darkMode: event.target.checked }))} />
              <span>設定を保存</span>
            </label>
          </div>
        </div>
      </section>

      <section className="card panel danger-panel section-gap">
        <div className="danger-heading">
          <AlertTriangle size={20} aria-hidden="true" />
          <div>
            <h2 className="panel-title">全データ削除</h2>
            <p>明細、未分類以外のカテゴリ、アップロード履歴、収入設定、保存済みPDF原本を削除対象にします。</p>
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
            onClick={() => void handleDeleteAllData()}
          >
            <Trash2 size={15} aria-hidden="true" />
            {deleteMutation.isPending ? "削除中" : "全データを削除"}
          </button>
        </div>
      </section>
      {messageDialog ? (
        <MessageDialog
          open
          title={messageDialog.title}
          description={messageDialog.description}
          actions={messageDialog.actions}
          tone={messageDialog.tone}
          onAction={messageDialog.onAction}
          onOpenChange={(open) => {
            if (!open) {
              messageDialog.onAction("cancel");
            }
          }}
        />
      ) : null}
    </>
  );
}
