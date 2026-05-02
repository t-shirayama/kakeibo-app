import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";
const npmCommand = "npm";

const processes = [
  spawnDevProcess(["run", "dev:backend"]),
  spawnDevProcess(["run", "dev:frontend"]),
];

let shuttingDown = false;

for (const child of processes) {
  child.on("error", (error) => {
    console.error(`開発サーバーの起動に失敗しました: ${error.message}`);
    shutdown(1);
  });

  child.on("exit", (code) => {
    if (!shuttingDown && code !== 0) {
      shutdown(code ?? 1);
    }
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

function spawnDevProcess(args) {
  return spawn(npmCommand, args, {
    cwd: rootDir,
    stdio: "inherit",
    // Windows + Node 24では.cmdを直接spawnするとEINVALになるため、npmはシェル経由で起動する。
    shell: isWindows,
  });
}

function shutdown(code) {
  shuttingDown = true;
  for (const child of processes) {
    if (!child.killed) {
      child.kill();
    }
  }
  process.exit(code);
}
