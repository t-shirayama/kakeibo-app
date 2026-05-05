import { defineConfig, devices } from "@playwright/test";

const frontendPort = Number(process.env.E2E_FRONTEND_PORT ?? 3000);
const backendPort = Number(process.env.E2E_BACKEND_PORT ?? 8000);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${frontendPort}`;
const backendURL = process.env.E2E_API_BASE_URL ?? `http://127.0.0.1:${backendPort}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: process.env.CI ? [["html"], ["github"]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/sample-user.json",
      },
    },
  ],
  webServer: [
    {
      command: "node scripts/start-backend-e2e.mjs",
      url: `${backendURL}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `npx next dev --webpack --hostname 127.0.0.1 --port ${frontendPort}`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        AUTH_GUARD_ENABLED: "true",
        NEXT_PUBLIC_API_BASE_URL: backendURL,
        NEXT_PUBLIC_AUTH_GUARD_ENABLED: "true",
      },
    },
  ],
});
