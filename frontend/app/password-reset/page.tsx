import Link from "next/link";

export default function PasswordResetPage() {
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand login-brand">
          <span className="brand-mark">K</span>
          <span>かけいぼノート</span>
        </div>
        <h1 className="page-title">パスワードリセット</h1>
        <p className="page-subtitle login-subtitle">
          登録済みのメールアドレスに再設定用リンクを送信します。
        </p>
        <form className="form-stack">
          <div className="form-field">
            <label htmlFor="email">メールアドレス</label>
            <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
          </div>
          <button className="button" type="submit">
            送信
          </button>
          <Link className="button secondary" href="/login">
            ログインに戻る
          </Link>
        </form>
      </section>
    </main>
  );
}
