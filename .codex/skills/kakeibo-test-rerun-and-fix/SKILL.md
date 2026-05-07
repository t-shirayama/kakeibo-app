---
name: kakeibo-test-rerun-and-fix
description: Use when rerunning this repository's test suites after changes, investigating failures, fixing the code or tests, and reporting final verification results. Trigger for requests like "テストを再実行して", "落ちているテストを直して", or "全部テスト回してエラーを修正して".
---

# Kakeibo Test Rerun And Fix

## Scope

Use this skill for project-wide regression checks or when the user explicitly asks to rerun tests and repair failures.

## Standard Order

1. Check `git status --short` so unrelated local changes are visible before editing.
2. Rerun the main suites with Docker Compose:
   - `docker compose run --rm backend python -m pytest`
   - `docker compose run --rm --no-deps frontend npm run test:unit`
   - `docker compose run --rm --no-deps frontend npm run test:integration`
   - `docker compose run --rm e2e`
3. If the task is clearly frontend-only and the user wants faster feedback, still prefer at least the affected frontend suites plus `npm run typecheck` and `npm run build`.

## Failure Handling

1. Fix one failure theme at a time. Do not mix unrelated cleanup.
2. Reproduce with the narrowest useful command before editing.
3. Prefer fixing production code when the behavior is genuinely broken. Update tests instead when the implementation is intentionally correct and the expectation is stale.
4. If a backend failure leaves the DB session or local data in a broken state, repair the state and then rerun the failing test.
5. If UI, API, security, DB, or workflow behavior changes as part of the fix, update the matching docs in the same task.

## Verification

1. Rerun the previously failing targeted test first.
2. Rerun the broader impacted suite.
3. If the user asked for a full rerun, finish by rerunning the full affected suites again and report pass counts.

## Reporting

- Lead with failures found and what was fixed.
- Include the exact verification commands that were rerun.
- Mention residual warnings separately from failures so they are not mistaken for test breaks.
