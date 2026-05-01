import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");
const backendDir = resolve(repoRoot, "backend");
const databaseUrl =
  process.env.E2E_DATABASE_URL ?? "mysql+pymysql://kakeibo:kakeibo_password@localhost:3306/kakeibo_e2e";
const backendPort = process.env.E2E_BACKEND_PORT ?? "8000";
const frontendPort = process.env.E2E_FRONTEND_PORT ?? "3000";

const python = resolvePython();
const env = {
  ...process.env,
  APP_ENV: "e2e",
  BACKEND_CORS_ORIGINS: process.env.E2E_FRONTEND_ORIGIN ?? `http://127.0.0.1:${frontendPort}`,
  COOKIE_SECURE: "false",
  DATABASE_URL: databaseUrl,
  JWT_SECRET_KEY: process.env.E2E_JWT_SECRET_KEY ?? "e2e-local-jwt-secret-key-with-at-least-32-bytes",
  NEXT_PUBLIC_API_BASE_URL: process.env.E2E_API_BASE_URL ?? `http://127.0.0.1:${backendPort}`,
  PYTHONUNBUFFERED: "1",
};

run("node", [resolve(__dirname, "reset-e2e-db.mjs")], { cwd: repoRoot, env });

const server = spawn(
  python,
  ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", backendPort],
  {
    cwd: backendDir,
    env,
    stdio: "inherit",
  },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.kill(signal);
  });
}

server.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

function run(command, args, options) {
  const result = spawnSync(command, args, { ...options, stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function resolvePython() {
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
