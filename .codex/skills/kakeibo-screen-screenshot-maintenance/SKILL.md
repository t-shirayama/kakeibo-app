---
name: kakeibo-screen-screenshot-maintenance
description: Use when updating current application screenshots in docs/designs/screens, refreshing README screen-image sections, or maintaining frontend/e2e/docs-screenshots.spec.ts for this repository.
---

# Kakeibo Screen Screenshot Maintenance

## Scope

Use this skill whenever the work involves current screen screenshots under `docs/designs/screens/`, including adding screens, re-shooting images, replacing current PNG files, or syncing README image references.

## Workflow

1. Read `docs/designs/README.md` and `frontend/e2e/docs-screenshots.spec.ts`.
2. Treat `frontend/e2e/docs-screenshots.spec.ts` as the single source of truth for capture targets and viewport ratio.
3. Generate screenshots with `docker compose run --rm -e DOC_SCREENSHOT_CAPTURE=1 e2e npx playwright test docs-screenshots.spec.ts`.
4. Copy the generated PNG files from `frontend/.doc-screenshots/` into `docs/designs/screens/`.
5. Update `docs/designs/README.md` and README image sections in the same work so the listed screens match the actual PNG files.
6. When a new screen is added, update both the capture target list and the image index documents together.
7. After documentation edits, run the unresolved-marker check documented in `AGENTS.md`.

## Output Checklist

- Current PNG files in `docs/designs/screens/` reflect the latest capture.
- `docs/designs/README.md` lists the same set of current screens.
- README screen-image sections reference the same current PNG files.
