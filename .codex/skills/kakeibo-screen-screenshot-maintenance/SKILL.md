---
name: kakeibo-screen-screenshot-maintenance
description: Use when updating current application screenshots in docs/designs, archiving previous screenshots, refreshing README screen-image sections, or maintaining frontend/e2e/docs-screenshots.spec.ts for this repository.
---

# Kakeibo Screen Screenshot Maintenance

## Scope

Use this skill whenever the work involves current screen screenshots under `docs/designs/`, including adding screens, re-shooting images, archiving replaced PNG files, or syncing README image references.

## Workflow

1. Read `docs/designs/README.md`, `docs/designs/archive/README.md`, and `frontend/e2e/docs-screenshots.spec.ts`.
2. If current screenshots already exist in `docs/designs/`, move the PNG files being replaced into `docs/designs/archive/screen-updates/<YYYY-MM-DD>/`.
3. Treat `frontend/e2e/docs-screenshots.spec.ts` as the single source of truth for capture targets and viewport ratio.
4. Generate screenshots with `docker compose run --rm -e DOC_SCREENSHOT_CAPTURE=1 e2e npx playwright test docs-screenshots.spec.ts`.
5. Copy the generated PNG files from `frontend/.doc-screenshots/` into `docs/designs/`.
6. Update `docs/designs/README.md` and README image sections in the same work so the listed screens match the actual PNG files.
7. When a new screen is added, update both the capture target list and the image index documents together.
8. After documentation edits, run the unresolved-marker check documented in `.codex/AGENTS.md`.

## Archive Rules

- Archive only the PNG files that are being replaced.
- Use a dated folder: `docs/designs/archive/screen-updates/<YYYY-MM-DD>/`.
- Keep file names unchanged inside the archive so older references remain easy to compare.

## Output Checklist

- Current PNG files in `docs/designs/` reflect the latest capture.
- Replaced PNG files are stored in the dated archive folder.
- `docs/designs/README.md` lists the same set of current screens.
- README screen-image sections reference the same current PNG files.
