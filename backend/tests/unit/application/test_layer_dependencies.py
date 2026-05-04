from __future__ import annotations

import ast
from pathlib import Path


APPLICATION_ROOT = Path("app/application")
DOMAIN_ROOT = Path("app/domain")


def _collect_import_violations(root: Path, *, forbidden_prefixes: tuple[str, ...]) -> list[str]:
    violations: list[str] = []

    for path in root.rglob("*.py"):
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and node.module and node.module.startswith(forbidden_prefixes):
                violations.append(f"{path}:{node.lineno} imports {node.module}")
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name.startswith(forbidden_prefixes):
                        violations.append(f"{path}:{node.lineno} imports {alias.name}")
    return violations


def test_domain_layer_does_not_import_outer_layers() -> None:
    violations = _collect_import_violations(
        DOMAIN_ROOT,
        forbidden_prefixes=("app.application", "app.infrastructure", "app.presentation"),
    )
    assert violations == []


def test_application_layer_does_not_import_outer_layers() -> None:
    violations = _collect_import_violations(
        APPLICATION_ROOT,
        forbidden_prefixes=("app.infrastructure", "app.presentation"),
    )
    assert violations == []
