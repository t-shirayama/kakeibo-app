export const settingsQueryKeys = {
  all: ["settings"] as const,
  current: () => [...settingsQueryKeys.all, "current"] as const,
};
