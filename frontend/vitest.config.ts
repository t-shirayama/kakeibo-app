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
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});
