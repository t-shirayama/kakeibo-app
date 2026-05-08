import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/test/**/*.{test,it.test}.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**"],
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/features/**/*-utils.ts",
        "src/lib/api/error.ts",
        "src/lib/format.ts",
        "src/lib/transaction-category.ts",
        "src/lib/year-month.ts",
      ],
      exclude: ["src/lib/generated/**", "src/test/**"],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
