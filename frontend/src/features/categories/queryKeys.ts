export const categoriesQueryKeys = {
  all: ["categories"] as const,
  lists: () => [...categoriesQueryKeys.all, "list"] as const,
  list: (includeInactive?: boolean) => [...categoriesQueryKeys.lists(), { include_inactive: includeInactive ?? false }] as const,
};
