import { FileUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";

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
            <button className="button" type="button">ファイルを選択</button>
          </div>
        </div>
      </section>

      <section className="card panel" style={{ marginTop: 20 }}>
        <h2 className="panel-title">取り込み履歴</h2>
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
              <tr>
                <td>card-statement-2026-04.pdf</td>
                <td>完了</td>
                <td>38件</td>
                <td>2026/05/01 09:12</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
