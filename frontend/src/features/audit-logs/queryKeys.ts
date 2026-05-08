import type { AuditLogListParams } from "@/lib/api";

export const auditLogsQueryKeys = {
  all: ["audit-logs"] as const,
  lists: () => [...auditLogsQueryKeys.all, "list"] as const,
  list: (params: AuditLogListParams) => [...auditLogsQueryKeys.lists(), params] as const,
};
