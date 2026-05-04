"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Save, Trash2 } from "lucide-react";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const [pageSize, setPageSize] = useState("20");
  const [dateFormat, setDateFormat] = useState("yyyy/MM/dd");
  const [darkMode, setDarkMode] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const saveMutation = useMutation({
    mutationFn: () => api.update_settings({ page_size: Number(pageSize), date_format: dateFormat, dark_mode: darkMode }),
  });
  const deleteMutation = useMutation({
    mutationFn: () => api.delete_all_data(confirmationText),
  });

  return (
    <>
      <PageHeader
        title="設定"
        subtitle="アカウント、表示、データ管理の基本設定です。"
        actions={
          <button className="button" type="button" onClick={() => saveMutation.mutate(undefined)} disabled={saveMutation.isPending}>
            <Save size={15} aria-hidden="true" />
            {saveMutation.isPending ? "保存中" : "保存"}
          </button>
        }
      />

      <section className="card panel">
        {saveMutation.error || deleteMutation.error ? <ApiErrorAlert error={saveMutation.error || deleteMutation.error} /> : null}
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
