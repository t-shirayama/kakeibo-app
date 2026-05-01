import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";

const processes = [
  spawn(npmCommand, ["run", "dev:backend"], { cwd: rootDir, stdio: "inherit" }),
  spawn(npmCommand, ["run", "dev:frontend"], { cwd: rootDir, stdio: "inherit" }),
];

let shuttingDown = false;

for (const child of processes) {
  child.on("exit", (code) => {
    if (!shuttingDown && code !== 0) {
      shutdown(code ?? 1);
    }
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

function shutdown(code) {
  shuttingDown = true;
  for (const child of processes) {
    if (!child.killed) {
      child.kill();
    }
  }
  process.exit(code);
}
