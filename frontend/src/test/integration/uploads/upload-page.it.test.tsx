import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import UploadPage from "@/features/uploads/upload-page";
import { api } from "@/lib/api";
import { clear_csrf_token } from "@/lib/csrf";
import type { UploadJobDto } from "@/lib/types";
import { renderWithRoute, setupIntegrationUser } from "@/test/integration/helpers";
import { mockUploadJobs } from "@/test/msw/fixtures";
import { apiUrl, jsonError } from "@/test/msw/http";
import { server } from "@/test/msw/server";

describe("UploadPage integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clear_csrf_token();
  });

  it("アップロード履歴と失敗時の再試行導線を表示する", async () => {
    renderWithRoute(<UploadPage />, "/upload");

    expect(await screen.findByRole("heading", { name: "PDF明細をアップロード" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "取り込み履歴" })).toBeInTheDocument();
    expect(await screen.findByText("2026_04_楽天カード.pdf")).toBeInTheDocument();
    expect(screen.getByText("2026_05_読み取り不可.pdf")).toBeInTheDocument();
    expect(screen.getByText("直近の失敗: 2026_05_読み取り不可.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ファイルを選び直して再試行" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "同じファイルで再試行" })).not.toBeInTheDocument();
  });

  it("PDFをドロップすると進捗を表示し、更新後の履歴を再取得する", async () => {
    const uploadJobs: UploadJobDto[] = [...mockUploadJobs];
    const uploadedJob: UploadJobDto = {
      upload_id: "upload-3",
      file_name: "integration-drop.pdf",
      stored_file_path: "storage/uploads/sample/upload-3/original.pdf",
      status: "completed",
      imported_count: 3,
      error_message: null,
      uploaded_at: "2026-05-03 13:05",
    };

    const listUploadsMock = vi.spyOn(api, "list_uploads").mockImplementation(async () => uploadJobs);
    const uploadMock = vi.spyOn(api, "upload_pdf").mockImplementation(async (file, options) => {
      options?.onProgress?.(45);
      uploadJobs.unshift(uploadedJob);
      return uploadedJob;
    });

    renderWithRoute(<UploadPage />, "/upload");

    expect(await screen.findByText("2026_04_楽天カード.pdf")).toBeInTheDocument();
    fireEvent.drop(screen.getByLabelText("PDFファイルのドロップゾーン"), {
      dataTransfer: {
        files: [new File(["%PDF-1.4 integration"], "integration-drop.pdf", { type: "application/pdf" })],
      },
    });

    await waitFor(() => expect(uploadMock).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("アップロード進捗")).toHaveTextContent("integration-drop.pdf");
    expect(screen.getByLabelText("アップロード進捗")).toHaveTextContent("処理完了");
    expect(screen.getAllByText("integration-drop.pdf").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("3件")).toBeInTheDocument();
    expect(listUploadsMock).toHaveBeenCalledTimes(2);
  });

  it("同じファイルで再試行を押すと直前に失敗したPDFを再送する", async () => {
    const user = setupIntegrationUser();
    const uploadCalls: string[] = [];
    const failedUploadError = new Error("アップロードに失敗しました。");

    vi.spyOn(api, "list_uploads").mockResolvedValue(mockUploadJobs);
    vi.spyOn(api, "upload_pdf")
      .mockImplementationOnce(async (file) => {
        uploadCalls.push(file.name);
        throw failedUploadError;
      })
      .mockImplementationOnce(async (file, options) => {
        uploadCalls.push(file.name);
        options?.onProgress?.(100);
        return {
          upload_id: "upload-4",
          file_name: file.name,
          stored_file_path: "storage/uploads/sample/upload-4/original.pdf",
          status: "completed",
          imported_count: 1,
          error_message: null,
          uploaded_at: "2026-05-03 13:30",
        };
      });

    renderWithRoute(<UploadPage />, "/upload");

    expect(await screen.findByText("2026_05_読み取り不可.pdf")).toBeInTheDocument();
    fireEvent.drop(screen.getByLabelText("PDFファイルのドロップゾーン"), {
      dataTransfer: {
        files: [new File(["%PDF-1.4 retry"], "retry-source.pdf", { type: "application/pdf" })],
      },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("アップロードに失敗しました。");
    const retryButton = await screen.findByRole("button", { name: "同じファイルで再試行" });
    await user.click(retryButton);

    await waitFor(() => expect(uploadCalls).toEqual(["retry-source.pdf", "retry-source.pdf"]));
  });

  it("CSRF期限切れの403を受けたらトークン再取得後に同じアップロードを再試行する", async () => {
    let csrfFetchCount = 0;
    const receivedTokens: string[] = [];

    server.use(
      http.get(apiUrl("/api/auth/csrf"), () => {
        csrfFetchCount += 1;
        return HttpResponse.json({ csrf_token: `upload-token-${csrfFetchCount}` });
      }),
      http.post(apiUrl("/api/uploads"), async ({ request }) => {
        receivedTokens.push(request.headers.get("x-csrf-token") ?? "");
        if (receivedTokens.length === 1) {
          return jsonError("CSRF session is required.", 403);
        }
        return HttpResponse.json({
          upload_id: "upload-5",
          file_name: "csrf-retry.pdf",
          stored_file_path: "storage/uploads/sample/upload-5/original.pdf",
          status: "completed",
          imported_count: 2,
          error_message: null,
          uploaded_at: "2026-05-03 13:45",
        });
      }),
    );

    vi.spyOn(api, "list_uploads")
      .mockResolvedValueOnce(mockUploadJobs)
      .mockResolvedValueOnce([
        {
          upload_id: "upload-5",
          file_name: "csrf-retry.pdf",
          stored_file_path: "storage/uploads/sample/upload-5/original.pdf",
          status: "completed",
          imported_count: 2,
          error_message: null,
          uploaded_at: "2026-05-03 13:45",
        },
        ...mockUploadJobs,
      ]);

    renderWithRoute(<UploadPage />, "/upload");

    expect(await screen.findByText("2026_04_楽天カード.pdf")).toBeInTheDocument();
    fireEvent.drop(screen.getByLabelText("PDFファイルのドロップゾーン"), {
      dataTransfer: {
        files: [new File(["%PDF-1.4 csrf"], "csrf-retry.pdf", { type: "application/pdf" })],
      },
    });

    await waitFor(() => expect(receivedTokens).toEqual(["upload-token-1", "upload-token-2"]));
    expect(csrfFetchCount).toBe(2);
    expect(await screen.findByText("csrf-retry.pdf")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
