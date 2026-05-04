import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

export function resolvePython(backendDir) {
  if (process.env.E2E_PYTHON) {
    return process.env.E2E_PYTHON;
  }

  const windowsVenvPython = resolve(backendDir, ".venv/Scripts/python.exe");
  if (existsSync(windowsVenvPython)) {
    return windowsVenvPython;
  }

  const unixVenvPython = resolve(backendDir, ".venv/bin/python");
  if (existsSync(unixVenvPython)) {
    return unixVenvPython;
  }

  return process.platform === "win32" ? "python" : "python3";
}

export function buildE2EBackendEnv(overrides = {}) {
  return {
    ...process.env,
    COOKIE_SECURE: "false",
    JWT_SECRET_KEY: process.env.E2E_JWT_SECRET_KEY ?? "e2e-local-jwt-secret-key-with-at-least-32-bytes",
    ...overrides,
  };
}

export function runOrExit(command, args, options) {
  const result = spawnSync(command, args, { ...options, stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
