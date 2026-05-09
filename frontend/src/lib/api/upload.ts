import { get_csrf_token, refresh_csrf_token } from "../csrf";
import type { UploadResponse } from "../generated/openapi-client";
import { get_api_base_url, refresh_auth_session, skips_auth_redirect, redirect_to_login } from "./core";
import { ApiError, is_csrf_error } from "./error";
import type { UploadPdfOptions } from "./types";

export async function uploadPdfWithProgress(formData: FormData, options?: UploadPdfOptions): Promise<UploadResponse> {
  return retryAfterUploadAuthRefresh("/api/uploads", () =>
    retryAfterUploadCsrfRefresh(() => executeUploadRequest(formData, options)),
  );
}

async function retryAfterUploadAuthRefresh(path: string, request: () => Promise<UploadResponse>): Promise<UploadResponse> {
  try {
    return await request();
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || skips_auth_redirect(path)) {
      throw error;
    }
  }

  const refreshed = await refresh_auth_session();
  if (!refreshed) {
    redirect_to_login();
    throw new ApiError(401, { message: "認証が必要です。" });
  }
  return request();
}

async function retryAfterUploadCsrfRefresh(request: () => Promise<UploadResponse>): Promise<UploadResponse> {
  try {
    return await request();
  } catch (error) {
    if (!shouldRefreshUploadCsrf(error)) {
      throw error;
    }
  }

  await refresh_csrf_token();
  return request();
}

function shouldRefreshUploadCsrf(error: unknown): boolean {
  return is_csrf_error(error);
}

async function executeUploadRequest(formData: FormData, options?: UploadPdfOptions): Promise<UploadResponse> {
  const csrfToken = await get_csrf_token();
  return new Promise<UploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${get_api_base_url()}/api/uploads`);
    xhr.withCredentials = true;
    xhr.setRequestHeader("X-CSRF-Token", csrfToken);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !options?.onProgress) {
        return;
      }
      options.onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onload = () => {
      try {
        const contentType = xhr.getResponseHeader("content-type") || "";
        const body = contentType.includes("application/json") && xhr.responseText ? JSON.parse(xhr.responseText) : null;
        if (xhr.status >= 200 && xhr.status < 300) {
          options?.onProgress?.(100);
          resolve(body as UploadResponse);
          return;
        }
        reject(new ApiError(xhr.status, body?.error ?? { message: xhr.statusText }));
      } catch (error) {
        reject(error);
      }
    };
    xhr.onerror = () => reject(new Error("アップロードに失敗しました。"));
    xhr.send(formData);
  });
}
