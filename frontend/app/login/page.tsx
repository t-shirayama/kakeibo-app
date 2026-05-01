import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand" style={{ padding: 0, marginBottom: 24 }}>
          <span className="brand-mark">K</span>
          <span>かけいぼノート</span>
        </div>
        <h1 className="page-title">ログイン</h1>
        <p className="page-subtitle" style={{ marginBottom: 24 }}>
          明細の取り込みと家計管理を続けるにはログインしてください。
        </p>
        <form className="form-stack">
          <div className="form-field">
            <label htmlFor="email">メールアドレス</label>
            <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
          </div>
          <div className="form-field">
            <label htmlFor="password">パスワード</label>
            <input id="password" name="password" type="password" autoComplete="current-password" />
          </div>
          <Link className="button" href="/dashboard">ログイン</Link>
        </form>
      </section>
    </main>
  );
}
