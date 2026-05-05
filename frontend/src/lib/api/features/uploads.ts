import type { ApiClient } from "../types";
import { generatedApi } from "../generated";
import { uploadPdfWithProgress } from "../upload";

export function createUploadApi(): Pick<ApiClient, "list_uploads" | "upload_pdf"> {
  return {
    async list_uploads() {
      return generatedApi.list_uploads();
    },
    async upload_pdf(file, options) {
      const formData = new FormData();
      formData.append("file", file);
      return uploadPdfWithProgress(formData, options);
    },
  };
}
