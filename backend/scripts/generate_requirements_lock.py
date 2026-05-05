from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = ROOT / "backend"
LOCK_PATH = BACKEND_ROOT / "requirements.lock"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    output = generate_lock_contents()
    if args.check:
        current = LOCK_PATH.read_text(encoding="utf-8") if LOCK_PATH.exists() else ""
        if current != output:
            print("Backend requirements.lock is out of date.")
            raise SystemExit(1)
        return

    LOCK_PATH.write_text(output, encoding="utf-8")


def generate_lock_contents() -> str:
    with tempfile.TemporaryDirectory(prefix="kakeibo-lock-") as temp_dir:
        temp_path = Path(temp_dir)
        venv_dir = temp_path / ".venv"
        subprocess.run([sys.executable, "-m", "venv", str(venv_dir)], check=True)

        python_path = venv_python_path(venv_dir)
        run(python_path, "-m", "pip", "install", "--upgrade", "pip")
        run(python_path, "-m", "pip", "install", "-e", ".[dev]", cwd=BACKEND_ROOT)

        freeze = run(
            python_path,
            "-m",
            "pip",
            "freeze",
            "--exclude-editable",
            capture_output=True,
            cwd=BACKEND_ROOT,
        )
        return normalize_freeze_output(freeze)


def venv_python_path(venv_dir: Path) -> Path:
    scripts_dir = "Scripts" if sys.platform.startswith("win") else "bin"
    executable = "python.exe" if sys.platform.startswith("win") else "python"
    return venv_dir / scripts_dir / executable


def normalize_freeze_output(freeze: str) -> str:
    lines = [line.strip() for line in freeze.splitlines() if line.strip()]
    return "\n".join(lines) + "\n"


def run(*args: str | Path, cwd: Path | None = None, capture_output: bool = False) -> str:
    completed = subprocess.run(
        [str(arg) for arg in args],
        check=True,
        cwd=str(cwd) if cwd else None,
        text=True,
        stdout=subprocess.PIPE if capture_output else None,
        stderr=subprocess.STDOUT if capture_output else None,
    )
    return completed.stdout if capture_output and completed.stdout is not None else ""


if __name__ == "__main__":
    main()
