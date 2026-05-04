from __future__ import annotations

import ast
from pathlib import Path


APPLICATION_ROOT = Path("app/application")


def test_application_importing_layer_does_not_import_infrastructure() -> None:
    violations: list[str] = []

    for path in (APPLICATION_ROOT / "importing").rglob("*.py"):
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and node.module and node.module.startswith("app.infrastructure"):
                violations.append(f"{path}:{node.lineno} imports {node.module}")
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name.startswith("app.infrastructure"):
                        violations.append(f"{path}:{node.lineno} imports {alias.name}")

    assert violations == []
