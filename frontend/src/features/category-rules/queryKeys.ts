export const categoryRulesQueryKeys = {
  all: ["category-rules"] as const,
  list: (includeInactive: boolean) => [...categoryRulesQueryKeys.all, "list", includeInactive] as const,
};
