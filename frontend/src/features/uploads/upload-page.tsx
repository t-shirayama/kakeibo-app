"use client";

import { FileUp, RotateCcw } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { EmptyState, LoadingState } from "@/components/state-block";
import { PageHeader } from "@/components/page-header";
import { uploadsQueryKeys } from "@/features/uploads/queryKeys";
import { api } from "@/lib/api";

const statusLabel = {
  queued: "待機中",
  processing: "処理中",
  completed: "完了",
  failed: "失敗",
};

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const retryInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lastFailedFile, setLastFailedFile] = useState<File | null>(null);
  const clearProgressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();
  const uploadsQuery = useQuery({ queryKey: uploadsQueryKeys.all, queryFn: api.list_uploads });
  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      api.upload_pdf(file, {
        onProgress: (progress) => setUploadProgress(progress),
      }),
    onMutate: (file) => {
      setCurrentFileName(file.name);
      setUploadProgress(0);
    },
    onSuccess: (job, file) => {
      if (job.status === "failed") {
        setLastFailedFile(file);
      } else {
        setLastFailedFile(null);
      }
      queryClient.invalidateQueries({ queryKey: uploadsQueryKeys.all });
    },
    onError: (_, file) => {
      setLastFailedFile(file);
    },
    onSettled: () => {
      setUploadProgress(100);
      if (clearProgressTimerRef.current) {
        clearTimeout(clearProgressTimerRef.current);
      }
      clearProgressTimerRef.current = setTimeout(() => {
        setCurrentFileName(null);
        setUploadProgress(0);
      }, 600);
    },
  });
  const uploadJobs = uploadsQuery.data ?? [];

  useEffect(() => {
    return () => {
      if (clearProgressTimerRef.current) {
        clearTimeout(clearProgressTimerRef.current);
      }
    };
  }, []);

  const uploadFile = (file: File | undefined) => {
    if (!file || uploadMutation.isPending) {
      return;
    }
    uploadMutation.mutate(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (retryInputRef.current) {
      retryInputRef.current.value = "";
    }
  };

  const latestFailedJob = uploadJobs.find((job) => job.status === "failed");

  return (
    <>
      <PageHeader title="アップロード" subtitle="カードや銀行のPDF明細を取り込み、取引データに変換します。" />

      <section className="card panel">
        <div
          className={`upload-zone${isDragging ? " dragging" : ""}`}
          aria-label="PDFファイルのドロップゾーン"
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setIsDragging(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            uploadFile(event.dataTransfer.files[0]);
          }}
        >
          <div>
            <FileUp size={42} color="#2f7df6" aria-hidden="true" />
            <h2>PDF明細をアップロード</h2>
            <p>ここにファイルをドロップ、またはボタンから選択してください。</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              onChange={(event) => {
                uploadFile(event.target.files?.[0]);
              }}
            />
            <button className="button" type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? "アップロード中" : "ファイルを選択"}
            </button>
          </div>
        </div>

        {currentFileName ? (
          <div className="upload-progress-card" aria-label="アップロード進捗">
            <div className="upload-progress-header">
              <strong>{currentFileName}</strong>
              <span>{uploadMutation.isPending ? `${uploadProgress}%` : "処理完了"}</span>
            </div>
            <div className="upload-progress-bar" aria-hidden="true">
              <div className="upload-progress-value" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="muted">
              {uploadMutation.isPending
                ? "サーバーへ送信しています。送信後は自動で取り込み履歴を更新します。"
                : "送信が完了しました。取り込み履歴を更新しています。"}
            </p>
          </div>
        ) : null}

        {latestFailedJob ? (
          <div className="upload-retry-card">
            <div>
              <strong>直近の失敗: {latestFailedJob.file_name}</strong>
              <p>{latestFailedJob.error_message ?? "PDFの取り込みに失敗しました。"}</p>
            </div>
            <div className="toolbar">
              {lastFailedFile ? (
                <button className="button secondary" type="button" onClick={() => uploadFile(lastFailedFile)} disabled={uploadMutation.isPending}>
                  <RotateCcw size={15} aria-hidden="true" />
                  同じファイルで再試行
                </button>
              ) : null}
              <input
                ref={retryInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={(event) => uploadFile(event.target.files?.[0])}
              />
              <button className="button secondary" type="button" onClick={() => retryInputRef.current?.click()} disabled={uploadMutation.isPending}>
                ファイルを選び直して再試行
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="card panel section-gap">
        <h2 className="panel-title">取り込み履歴</h2>
        {uploadsQuery.error || uploadMutation.error ? <ApiErrorAlert error={uploadsQuery.error || uploadMutation.error} /> : null}
        {uploadsQuery.isLoading ? (
          <LoadingState />
        ) : uploadJobs.length === 0 ? (
          <EmptyState title="アップロード履歴がありません" description="PDFをアップロードすると処理状況がここに表示されます。" />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ファイル名</th>
                  <th>状態</th>
                  <th>取引件数</th>
                  <th>取り込み日時</th>
                  <th>エラー</th>
                </tr>
              </thead>
              <tbody>
                {uploadJobs.map((job) => (
                  <tr key={job.upload_id}>
                    <td>{job.file_name}</td>
                    <td>{statusLabel[job.status]}</td>
                    <td>{job.imported_count}件</td>
                    <td>{job.uploaded_at}</td>
                    <td>{job.error_message ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
