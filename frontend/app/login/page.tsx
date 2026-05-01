"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<Error | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand login-brand">
          <span className="brand-mark">K</span>
          <span>かけいぼノート</span>
        </div>
        <h1 className="page-title">ログイン</h1>
        <p className="page-subtitle login-subtitle">
          明細の取り込みと家計管理を続けるにはログインしてください。
        </p>
        <form
          className="form-stack"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setIsSubmitting(true);
            const formData = new FormData(event.currentTarget);
            try {
              await api.login({
                email: String(formData.get("email") ?? ""),
                password: String(formData.get("password") ?? ""),
              });
              const searchParams = new URLSearchParams(window.location.search);
              router.push(searchParams.get("redirect") || "/dashboard");
              router.refresh();
            } catch (caught) {
              setError(caught instanceof Error ? caught : new Error("ログインに失敗しました。"));
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          {error ? <ApiErrorAlert error={error} /> : null}
          <div className="form-field">
            <label htmlFor="email">メールアドレス</label>
            <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
          </div>
          <div className="form-field">
            <label htmlFor="password">パスワード</label>
            <input id="password" name="password" type="password" autoComplete="current-password" />
          </div>
          <div className="login-links">
            <Link href="/password-reset">パスワードを忘れた場合</Link>
          </div>
          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "ログイン中" : "ログイン"}
          </button>
        </form>
      </section>
    </main>
  );
}
