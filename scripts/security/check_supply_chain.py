from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_RULES = REPO_ROOT / "scripts" / "security" / "supply-chain-rules.json"


def normalize_name(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()


def package_name_from_lock_path(path: str, package: dict[str, Any]) -> str | None:
    if path == "":
        return None
    name = package.get("name")
    if isinstance(name, str) and name:
        return name

    parts = path.split("node_modules/")
    if len(parts) < 2:
        return None
    tail = parts[-1].split("/")
    if not tail:
        return None
    if tail[0].startswith("@") and len(tail) >= 2:
        return f"{tail[0]}/{tail[1]}"
    return tail[0]


def load_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as file:
        value = json.load(file)
    if not isinstance(value, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return value


def denied_lookup(rules: dict[str, Any], ecosystem: str) -> dict[str, dict[str, Any]]:
    denied = rules.get("deniedPackages", {}).get(ecosystem, [])
    lookup: dict[str, dict[str, Any]] = {}
    for item in denied:
        lookup[normalize_name(item["name"])] = item
    return lookup


def allowed_install_script_lookup(rules: dict[str, Any]) -> dict[str, set[str]]:
    allowed: dict[str, set[str]] = {}
    for item in rules.get("allowedNpmInstallScripts", []):
        allowed[normalize_name(item["name"])] = set(item.get("versions", []))
    return allowed


def check_npm_lock(repo_root: Path, rules: dict[str, Any]) -> list[str]:
    lock_path = repo_root / "frontend" / "package-lock.json"
    lock = load_json(lock_path)
    packages = lock.get("packages")
    if not isinstance(packages, dict):
        return [f"{lock_path}: packages object is missing"]

    errors: list[str] = []
    denied = denied_lookup(rules, "npm")
    allowed_install_scripts = allowed_install_script_lookup(rules)

    for path, package in sorted(packages.items()):
        if path == "":
            continue
        if not isinstance(package, dict):
            errors.append(f"{lock_path}: {path} must be an object")
            continue

        name = package_name_from_lock_path(path, package)
        version = package.get("version")
        normalized = normalize_name(name or path)

        if not isinstance(version, str) or not version:
            errors.append(f"{lock_path}: {path} is missing a pinned version")
            continue

        denied_package = denied.get(normalized)
        if denied_package and version in set(denied_package.get("versions", [])):
            reason = denied_package.get("reason", "denied package version")
            errors.append(f"{lock_path}: {name}@{version} is denied: {reason}")

        if package.get("hasInstallScript") is True:
            allowed_versions = allowed_install_scripts.get(normalized)
            if allowed_versions is None or version not in allowed_versions:
                errors.append(
                    f"{lock_path}: {name}@{version} has an install script but is not allowlisted"
                )

        if package.get("inBundle") is not True:
            resolved = package.get("resolved")
            integrity = package.get("integrity")
            if not isinstance(resolved, str) or not resolved.startswith(
                "https://registry.npmjs.org/"
            ):
                errors.append(f"{lock_path}: {name}@{version} must resolve from registry.npmjs.org")
            if not isinstance(integrity, str) or not integrity.startswith("sha"):
                errors.append(f"{lock_path}: {name}@{version} is missing Subresource Integrity")

    return errors


def parse_requirement(line: str) -> tuple[str, str] | None:
    requirement = line.strip()
    if not requirement or requirement.startswith("#"):
        return None
    if "==" not in requirement:
        return ("", "")
    left, right = requirement.split("==", 1)
    name = left.split("[", 1)[0].strip()
    version = right.split(";", 1)[0].strip()
    return (name, version)


def check_python_lock(repo_root: Path, rules: dict[str, Any]) -> list[str]:
    lock_path = repo_root / "backend" / "requirements.lock"
    denied = denied_lookup(rules, "pypi")
    errors: list[str] = []

    for line_number, line in enumerate(lock_path.read_text(encoding="utf-8").splitlines(), start=1):
        parsed = parse_requirement(line)
        if parsed is None:
            continue
        name, version = parsed
        if not name or not version:
            errors.append(f"{lock_path}:{line_number}: dependency must be pinned with ==")
            continue

        denied_package = denied.get(normalize_name(name))
        if denied_package and version in set(denied_package.get("versions", [])):
            reason = denied_package.get("reason", "denied package version")
            errors.append(f"{lock_path}:{line_number}: {name}=={version} is denied: {reason}")

    return errors


def check_github_actions(repo_root: Path) -> list[str]:
    workflow_dir = repo_root / ".github" / "workflows"
    if not workflow_dir.exists():
        return []

    errors: list[str] = []
    uses_pattern = re.compile(r"^\s*uses:\s*([^@\s]+)@([^#\s]+)")
    sha_pattern = re.compile(r"^[a-f0-9]{40}$")

    for path in sorted(workflow_dir.glob("*.y*ml")):
        for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            match = uses_pattern.match(line)
            if match is None:
                continue
            action, ref = match.groups()
            if action.startswith("./") or action.startswith("docker://"):
                continue
            if sha_pattern.fullmatch(ref) is None:
                errors.append(f"{path}:{line_number}: {action}@{ref} must be pinned to a commit SHA")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Check local supply-chain guardrails.")
    parser.add_argument("--repo-root", type=Path, default=REPO_ROOT)
    parser.add_argument("--rules", type=Path, default=DEFAULT_RULES)
    args = parser.parse_args()

    repo_root = args.repo_root.resolve()
    rules = load_json(args.rules.resolve())
    errors = [
        *check_npm_lock(repo_root, rules),
        *check_python_lock(repo_root, rules),
        *check_github_actions(repo_root),
    ]

    if errors:
        print("Supply-chain guardrail check failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print("Supply-chain guardrail check passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
