import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { buildE2EBackendEnv, resolvePython, runOrExit } from "./e2e-runtime.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");
const backendDir = resolve(repoRoot, "backend");
const databaseUrl =
  process.env.E2E_DATABASE_URL ?? "mysql+pymysql://kakeibo:kakeibo_password@localhost:3306/kakeibo_e2e";
const backendPort = process.env.E2E_BACKEND_PORT ?? "8000";
const frontendPort = process.env.E2E_FRONTEND_PORT ?? "3000";

const python = resolvePython(backendDir);
const env = buildE2EBackendEnv({
  APP_ENV: "e2e",
  BACKEND_CORS_ORIGINS: process.env.E2E_FRONTEND_ORIGIN ?? `http://127.0.0.1:${frontendPort}`,
  DATABASE_URL: databaseUrl,
  NEXT_PUBLIC_API_BASE_URL: process.env.E2E_API_BASE_URL ?? `http://127.0.0.1:${backendPort}`,
  PYTHONUNBUFFERED: "1",
});

runOrExit("node", [resolve(__dirname, "reset-e2e-db.mjs")], { cwd: repoRoot, env });

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
