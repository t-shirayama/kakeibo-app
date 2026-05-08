import { createAuthApi } from "./features/auth";
import { createAuditLogApi } from "./features/audit-logs";
import { createCategoryApi } from "./features/categories";
import { createCategoryRuleApi } from "./features/category-rules";
import { createIncomeSettingsApi } from "./features/income-settings";
import { createReportApi } from "./features/reports";
import { createSettingsApi } from "./features/settings";
import { createTransactionApi } from "./features/transactions";
import { createUploadApi } from "./features/uploads";
import type { ApiClient } from "./types";

export { ApiError, is_api_error, is_csrf_error, is_missing_csrf_session_error, normalize_api_error } from "./error";
export type { ApiErrorShape } from "./error";
export {
  api_blob,
  api_fetch,
  api_mutation,
  get_api_base_url,
  retry_after_csrf_refresh,
  with_csrf_headers,
} from "./core";
export type * from "./types";

export const api: ApiClient = {
  ...createTransactionApi(),
  ...createUploadApi(),
  ...createReportApi(),
  ...createAuthApi(),
  ...createSettingsApi(),
  ...createCategoryApi(),
  ...createCategoryRuleApi(),
  ...createIncomeSettingsApi(),
  ...createAuditLogApi(),
};
