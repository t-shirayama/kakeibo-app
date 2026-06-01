import { fixupConfigRules } from "@eslint/compat";
import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const nextConfigs = nextCoreWebVitals.map((config) => {
  if (!config.languageOptions) {
    return config;
  }

  const { globals: _globals, ...languageOptions } = config.languageOptions;
  return {
    ...config,
    languageOptions,
  };
});

export default defineConfig([
  ...fixupConfigRules(nextConfigs),
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "eslint.config.mjs",
    "next-env.d.ts",
    "postcss.config.mjs",
    "playwright-report/**",
    "scripts/*.mjs",
    "test-results/**",
    "src/lib/generated/**",
  ]),
]);
