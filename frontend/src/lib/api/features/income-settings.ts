import type { ApiClient } from "../types";
import { generatedApi } from "../generated";

export function createIncomeSettingsApi(): Pick<
  ApiClient,
  | "list_income_settings"
  | "create_income_setting"
  | "update_income_setting"
  | "delete_income_setting"
  | "upsert_income_override"
  | "delete_income_override"
> {
  return {
    async list_income_settings() {
      return generatedApi.list_income_settings();
    },
    async create_income_setting(request) {
      return generatedApi.create_income_setting(request);
    },
    async update_income_setting(incomeSettingId, request) {
      return generatedApi.update_income_setting({ income_setting_id: incomeSettingId }, request);
    },
    async delete_income_setting(incomeSettingId) {
      return generatedApi.delete_income_setting({ income_setting_id: incomeSettingId }) as Promise<{ status: string }>;
    },
    async upsert_income_override(incomeSettingId, targetMonth, request) {
      return generatedApi.upsert_income_override({ income_setting_id: incomeSettingId, target_month: targetMonth }, request);
    },
    async delete_income_override(incomeSettingId, targetMonth) {
      return generatedApi.delete_income_override({ income_setting_id: incomeSettingId, target_month: targetMonth });
    },
  };
}
