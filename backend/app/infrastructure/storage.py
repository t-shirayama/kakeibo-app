from __future__ import annotations

from pathlib import Path
from uuid import UUID


class LocalUploadStorage:
    def __init__(self, root: str) -> None:
        self._root = Path(root)

    def save_original(self, *, user_id: UUID, upload_id: UUID, content: bytes) -> str:
        path = self._root / str(user_id) / str(upload_id) / "original.pdf"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return path.as_posix()

    def delete(self, stored_file_path: str) -> None:
        path = Path(stored_file_path)
        if path.exists() and path.is_file():
            path.unlink()
