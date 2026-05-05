---
name: kakeibo-zap-security-scan
description: Use when working on this repository's OWASP ZAP Docker Compose API scan, summarizing zap-reports, adjusting scripts/security/zap-api-scan.sh, or checking authentication/CSRF behavior for ZAP scans.
---

# Kakeibo ZAP Security Scan

## Workflow

1. Read `README.md` and `docs/specs/security.md` if scan behavior or security policy may change.
2. Use `docker compose run --rm backend python -m alembic upgrade head` before scanning when sample data may be missing or stale.
3. Run the local scan with `docker compose run --rm zap`.
4. Summarize `zap-reports/zap-api-report.md` or `zap-reports/zap-api-report.json` by severity, affected endpoint, likely cause, and recommended next action.
5. Remember that authentication is HttpOnly Cookie based. Do not replace the scan with a fixed `Authorization: Bearer` token unless the app's auth design changes.
6. For authenticated ZAP requests, keep the flow in `scripts/security/zap-api-scan.sh`: wait for `/api/health`, fetch `/api/auth/csrf`, login with the sample user, save cookies, then pass Cookie and `X-CSRF-Token` through ZAP Replacer rules.
7. If any finding needs follow-up implementation, check `docs/tasks/open.md` for duplicates and add a concise unchecked task there. Include the affected endpoint/header, expected remediation, and the ZAP report source.
8. When implementing a ZAP-derived task, rerun `docker compose run --rm zap` after the fix and confirm the targeted alert no longer appears before marking the task complete.

## Validation

- Confirm `docker compose config --services` does not list `zap`.
- Confirm `docker compose --profile security config --services` lists `zap`.
- Confirm reports exist in `zap-reports/` after a scan.
- For ZAP-derived fixes, compare the new `zap-reports/zap-api-report.md` or JSON against the original finding and state whether the specific alert was resolved.
- After documentation changes, run the repository's unresolved-marker check documented in `.codex/AGENTS.md`.

## Common Findings

- `POST /api/uploads` returning 500 usually means ZAP sent malformed or empty multipart input. Treat it as an API robustness issue to investigate before dismissing.
- Missing security headers such as `X-Content-Type-Options` or `Cross-Origin-Resource-Policy` are usually cross-cutting FastAPI middleware work.
- Large numbers of 4xx responses are often expected from fuzzed placeholder IDs or invalid query values, but check whether any endpoint leaks internal details.

## Task Triage

Add tasks to `docs/tasks/open.md` when a finding is reproducible, actionable, and not already tracked. Prefer this shape:

```md
- [ ] ZAP: <short action>
  - 対象: `<endpoint or header>`
  - 対応: <expected remediation>
  - 根拠: `zap-reports/zap-api-report.md` の <alert name>
```

Do not add tasks for purely informational findings unless they reveal a concrete product risk.

When completing a ZAP task, update or move the task only after a fresh ZAP run confirms the target finding is gone. If unrelated ZAP warnings remain, mention them separately instead of blocking the fixed task.
