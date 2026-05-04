import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import LoginPage from "../../../../app/login/page";
import { getMockRouter, setMockUrl } from "@/test/navigation";
import { renderWithClient } from "@/test/render";
import { server } from "@/test/msw/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

describe("LoginPage integration", () => {
  it("CSRF取得後にログインAPIへ接続し、戻り先へ遷移する", async () => {
    const user = userEvent.setup();
    setMockUrl("/login?redirect=%2Ftransactions");
    renderWithClient(<LoginPage />);

    await user.type(screen.getByLabelText("メールアドレス"), "sample@example.com");
    await user.type(screen.getByLabelText("パスワード"), "SamplePassw0rd!");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => expect(getMockRouter().push).toHaveBeenCalledWith("/transactions"));
    expect(getMockRouter().refresh).toHaveBeenCalledTimes(1);
  });

  it("ログインAPIのエラーを画面に表示する", async () => {
    server.use(
      http.post(`${API_BASE_URL}/api/auth/login`, () =>
        HttpResponse.json({ error: { message: "メールアドレスまたはパスワードが違います。" } }, { status: 401 }),
      ),
    );

    const user = userEvent.setup();
    renderWithClient(<LoginPage />);

    await user.type(screen.getByLabelText("メールアドレス"), "sample@example.com");
    await user.type(screen.getByLabelText("パスワード"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("メールアドレスまたはパスワードが違います。");
  });
});
