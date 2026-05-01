import { FileUp } from "lucide-react";
import { EmptyState } from "@/components/state-block";
import { PageHeader } from "@/components/page-header";
import { uploadJobs } from "@/lib/mock-data";

const statusLabel = {
  queued: "待機中",
  processing: "処理中",
  completed: "完了",
  failed: "失敗",
};

export default function UploadPage() {
  return (
    <>
      <PageHeader title="アップロード" subtitle="カードや銀行のPDF明細を取り込み、取引データに変換します。" />

      <section className="card panel">
        <div className="upload-zone">
          <div>
            <FileUp size={42} color="#2f7df6" aria-hidden="true" />
            <h2>PDF明細をアップロード</h2>
            <p>ここにファイルをドロップ、またはボタンから選択してください。</p>
            <button className="button" type="button">
              ファイルを選択
            </button>
          </div>
        </div>
      </section>

      <section className="card panel section-gap">
        <h2 className="panel-title">取り込み履歴</h2>
        {uploadJobs.length === 0 ? (
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
                </tr>
              </thead>
              <tbody>
                {uploadJobs.map((job) => (
                  <tr key={job.upload_job_id}>
                    <td>{job.file_name}</td>
                    <td>{statusLabel[job.status]}</td>
                    <td>{job.imported_transaction_count}件</td>
                    <td>{job.created_at}</td>
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
