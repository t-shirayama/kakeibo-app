import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import LoginPage from "../../../../app/login/page";
import { renderWithRoute, setupIntegrationUser } from "@/test/integration/helpers";
import { mockUser } from "@/test/msw/fixtures";
import { apiUrl, jsonError } from "@/test/msw/http";
import { server } from "@/test/msw/server";
import { getMockRouter } from "@/test/navigation";

describe("LoginPage integration", () => {
  it("CSRF取得後にログインAPIへ接続し、戻り先へ遷移する", async () => {
    const user = setupIntegrationUser();
    renderWithRoute(<LoginPage />, "/login?redirect=%2Ftransactions");

    await user.type(screen.getByLabelText("メールアドレス"), "sample@example.com");
    await user.type(screen.getByLabelText("パスワード"), "SamplePassw0rd!");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => expect(getMockRouter().push).toHaveBeenCalledWith("/transactions"));
    expect(getMockRouter().refresh).not.toHaveBeenCalled();
  });

  it("ログインAPIのエラーを画面に表示する", async () => {
    server.use(
      http.post(apiUrl("/api/auth/login"), () => jsonError("メールアドレスまたはパスワードが違います。", 401)),
    );

    const user = setupIntegrationUser();
    renderWithRoute(<LoginPage />, "/login");

    await user.type(screen.getByLabelText("メールアドレス"), "sample@example.com");
    await user.type(screen.getByLabelText("パスワード"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("メールアドレスまたはパスワードが違います。");
  });

  it("CSRF session不足の403を受けたらトークン再取得後にログインを再試行する", async () => {
    let csrfFetchCount = 0;
    let loginAttempts = 0;
    server.use(
      http.get(apiUrl("/api/auth/csrf"), () => {
        csrfFetchCount += 1;
        return HttpResponse.json({ csrf_token: `csrf-token-${csrfFetchCount}` });
      }),
      http.post(apiUrl("/api/auth/login"), () => {
        loginAttempts += 1;
        if (loginAttempts === 1) {
          return jsonError("CSRF session is required.", 403);
        }
        return HttpResponse.json(mockUser);
      }),
    );

    const user = setupIntegrationUser();
    renderWithRoute(<LoginPage />, "/login?redirect=%2Ftransactions");

    await user.type(screen.getByLabelText("メールアドレス"), "sample@example.com");
    await user.type(screen.getByLabelText("パスワード"), "SamplePassw0rd!");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => expect(getMockRouter().push).toHaveBeenCalledWith("/transactions"));
    expect(loginAttempts).toBe(2);
    expect(csrfFetchCount).toBe(2);
  });
});
