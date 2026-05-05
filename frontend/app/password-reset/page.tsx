"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

export default function PasswordResetPage() {
  const [sent, setSent] = useState(false);

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand login-brand">
          <span className="brand-mark">K</span>
          <span>かけいぼノート</span>
        </div>
        <h1 className="page-title">パスワードリセット</h1>
        {sent ? (
          <div className="form-stack">
            <div className="success-panel" role="status">
              <CheckCircle2 size={22} aria-hidden="true" />
              <div>
                <strong>送信しました</strong>
                <p>登録済みのメールアドレスの場合、再設定手順を確認できます。</p>
              </div>
            </div>
            <Link className="button" href="/login" prefetch={false}>
              ログインに戻る
            </Link>
          </div>
        ) : (
          <>
            <p className="page-subtitle login-subtitle">
              登録済みのメールアドレスに再設定用リンクを送信します。
            </p>
            <form
              className="form-stack"
              onSubmit={(event) => {
                event.preventDefault();
                setSent(true);
              }}
            >
              <div className="form-field">
                <label htmlFor="email">メールアドレス</label>
                <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
              </div>
              <button className="button" type="submit">
                送信
              </button>
              <Link className="button secondary" href="/login" prefetch={false}>
                ログインに戻る
              </Link>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
