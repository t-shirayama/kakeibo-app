import type { ApiClient, DeleteDataRequest, SettingsResponse } from "../types";
import { downloadBlob } from "../download";
import { generatedApi } from "../generated";

export function createSettingsApi(): Pick<ApiClient, "get_settings" | "update_settings" | "delete_all_data" | "export_user_data"> {
  return {
    async get_settings() {
      return generatedApi.get_settings() as Promise<SettingsResponse>;
    },
    async update_settings(request) {
      return generatedApi.update_settings(request) as Promise<SettingsResponse>;
    },
    async delete_all_data(confirmationText, password) {
      const body: DeleteDataRequest = {
        confirmation_text: confirmationText || undefined,
        password: password || undefined,
      };
      return generatedApi.delete_all_data(body) as Promise<{ status: string }>;
    },
    async export_user_data() {
      const blob = await generatedApi.export_user_data();
      downloadBlob(blob, "kakeibo-export.xlsx");
    },
  };
}
