import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildE2EBackendEnv, resolvePython, runOrExit } from "./e2e-runtime.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");
const backendDir = resolve(repoRoot, "backend");
const databaseUrl =
  process.env.E2E_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "mysql+pymysql://kakeibo:kakeibo_password@localhost:3306/kakeibo_e2e";
const adminDatabaseUrl =
  process.env.E2E_ADMIN_DATABASE_URL ?? "mysql+pymysql://root:root_password@localhost:3306/mysql";
const python = resolvePython(backendDir);
const env = buildE2EBackendEnv({
  DATABASE_URL: databaseUrl,
});

runPython(
  [
    "-c",
    `
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

app_url = make_url("${databaseUrl}")
admin_url = make_url("${adminDatabaseUrl}")
database = app_url.database
app_user = app_url.username

def quote_identifier(value):
    backtick = chr(96)
    return backtick + value.replace(backtick, backtick * 2) + backtick

def quote_string(value):
    return "'" + value.replace("'", "''") + "'"

engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
with engine.connect() as connection:
    connection.execute(text(f"DROP DATABASE IF EXISTS {quote_identifier(database)}"))
    connection.execute(text(f"CREATE DATABASE IF NOT EXISTS {quote_identifier(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"))
    connection.execute(text(f"GRANT ALL PRIVILEGES ON {quote_identifier(database)}.* TO {quote_string(app_user)}@'%'"))
engine.dispose()
`,
  ],
  env,
);

runPython(["-m", "alembic", "downgrade", "base"], env);
runPython(["-m", "alembic", "upgrade", "head"], env);
runPython(["-m", "app.bootstrap.seed_sample_data", "--reset"], env);

function runPython(args, env) {
  runOrExit(python, args, {
    cwd: backendDir,
    env,
  });
}
