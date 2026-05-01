import { PageHeader } from "@/components/page-header";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="設定" subtitle="アカウント、通貨、通知、データ連携の基本設定です。" />

      <section className="card panel">
        <div className="settings-list">
          <div className="settings-row">
            <div>
              <h2>表示通貨</h2>
              <p>金額表示は日本円を既定にします。</p>
            </div>
            <select className="select" aria-label="表示通貨">
              <option>JPY</option>
            </select>
          </div>
          <div className="settings-row">
            <div>
              <h2>月の開始日</h2>
              <p>レポートや予算集計で使う締め日を指定します。</p>
            </div>
            <select className="select" aria-label="月の開始日">
              <option>毎月1日</option>
              <option>毎月25日</option>
            </select>
          </div>
          <div className="settings-row">
            <div>
              <h2>PDF取り込み</h2>
              <p>明細の自動分類と重複検知を有効にします。</p>
            </div>
            <button className="button secondary" type="button">
              詳細
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
