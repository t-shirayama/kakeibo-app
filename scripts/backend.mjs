import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backendDir = path.join(rootDir, "backend");
const isWindows = process.platform === "win32";
const python = path.join(backendDir, ".venv", isWindows ? "Scripts/python.exe" : "bin/python");
const venvModule = "venv";

const command = process.argv[2];

if (!command || !["setup", "migrate", "dev", "test"].includes(command)) {
  console.error("Usage: node scripts/backend.mjs <setup|migrate|dev|test>");
  process.exit(1);
}

if (command === "setup") {
  if (!existsSync(python)) {
    run(findSystemPython(), ["-m", venvModule, ".venv"]);
  }
  ensurePython312(python);
  run(python, ["-m", "pip", "install", "--upgrade", "pip"]);
  run(python, ["-m", "pip", "install", "-e", ".[dev]"]);
  run(python, ["-m", "alembic", "upgrade", "head"]);
  process.exit(0);
}

ensureVenv();
ensurePython312(python);

if (command === "migrate") {
  run(python, ["-m", "alembic", "upgrade", "head"]);
} else if (command === "dev") {
  run(python, ["-m", "uvicorn", "app.main:app", "--reload"]);
} else if (command === "test") {
  run(python, ["-m", "compileall", "app", "tests"]);
  run(python, ["-m", "pytest"]);
}

function ensureVenv() {
  if (!existsSync(python)) {
    console.error("backend/.venv がありません。先に npm run setup:backend を実行してください。");
    process.exit(1);
  }
}

function findSystemPython() {
  const python312 = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "Programs", "Python", "Python312", "python.exe")
    : null;
  const candidates = isWindows
    ? [["py", "-3.12"], python312 ? [python312] : null, ["python"]].filter(Boolean)
    : [["python3.12"], ["python3"], ["python"]];
  for (const candidate of candidates) {
    const result = spawnSync(candidate[0], [...candidate.slice(1), "-c", "import sys; raise SystemExit(0 if sys.version_info[:2] == (3, 12) else 1)"], {
      stdio: "ignore",
    });
    if (result.status === 0) {
      return candidate;
    }
  }
  console.error("Python 3.12 が見つかりません。Python 3.12をインストールしてから再実行してください。");
  process.exit(1);
}

function ensurePython312(pythonPath) {
  const result = spawnSync(
    pythonPath,
    ["-c", "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"],
    { cwd: backendDir, encoding: "utf8" },
  );
  const version = result.stdout?.trim() ?? "";
  if (result.status !== 0 || version !== "3.12") {
    console.error(`backend/.venv は Python 3.12 ではありません: ${version || "unknown"}`);
    if (result.error) {
      console.error(result.error.message);
    }
    console.error("Python 3.12で backend/.venv を作り直してから再実行してください。");
    process.exit(1);
  }
}

function run(commandOrTuple, args = []) {
  const commandName = Array.isArray(commandOrTuple) ? commandOrTuple[0] : commandOrTuple;
  const commandArgs = Array.isArray(commandOrTuple) ? [...commandOrTuple.slice(1), ...args] : args;
  const result = spawnSync(commandName, commandArgs, {
    cwd: backendDir,
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
