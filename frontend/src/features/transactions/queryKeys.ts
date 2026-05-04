import type { TransactionListParams } from "@/lib/api";

export const transactionsQueryKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionsQueryKeys.all, "list"] as const,
  list: (params: TransactionListParams) => [...transactionsQueryKeys.lists(), params] as const,
};
