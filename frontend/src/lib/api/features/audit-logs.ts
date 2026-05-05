import type { ApiClient } from "../types";
import { generatedApi } from "../generated";

export function createAuditLogApi(): Pick<ApiClient, "list_audit_logs"> {
  return {
    async list_audit_logs(params = {}) {
      return generatedApi.list_audit_logs(params);
    },
  };
}
