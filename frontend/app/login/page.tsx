"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ApiErrorAlert } from "@/components/api-error-alert";
import { api, is_missing_csrf_session_error } from "@/lib/api";
import { refresh_csrf_token } from "@/lib/csrf";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<Error | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    void refresh_csrf_token().catch(() => null);
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function submitLogin(email: string, password: string) {
    try {
      return await api.login({ email, password });
    } catch (caught) {
      if (!isMissingCsrfSessionError(caught)) {
        throw caught;
      }

      await refresh_csrf_token();
      return api.login({ email, password });
    }
  }

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
            const email = String(formData.get("email") ?? "");
            const password = String(formData.get("password") ?? "");
            try {
              await submitLogin(email, password);
              const searchParams = new URLSearchParams(window.location.search);
              router.push(searchParams.get("redirect") || "/dashboard");
            } catch (caught) {
              if (mountedRef.current) {
                setError(caught instanceof Error ? caught : new Error("ログインに失敗しました。"));
              }
            } finally {
              if (mountedRef.current) {
                setIsSubmitting(false);
              }
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
            <Link href="/password-reset" prefetch={false}>パスワードを忘れた場合</Link>
          </div>
          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "ログイン中" : "ログイン"}
          </button>
        </form>
      </section>
    </main>
  );
}

function isMissingCsrfSessionError(error: unknown): boolean {
  return is_missing_csrf_session_error(error);
}
