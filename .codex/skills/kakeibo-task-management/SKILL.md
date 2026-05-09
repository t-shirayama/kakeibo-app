---
name: kakeibo-task-management
description: Use when adding, organizing, prioritizing, completing, or moving project tasks in docs/tasks/open.md and docs/tasks/completed.md from user requests, review notes, scan results, or planning documents.
---

# Kakeibo Task Management

## Scope

Use this skill whenever a request is to add tasks, turn findings into tasks, update task state, or review `docs/tasks/`.

## Workflow

1. Read `docs/tasks/README.md`, `docs/tasks/open.md`, and any source document or user notes.
2. Check `docs/tasks/open.md` and `docs/tasks/completed.md` for duplicates before adding tasks.
3. Add only implementation or documentation tasks that are actionable. Do not add vague observations without an expected outcome.
4. Preserve `docs/tasks/open.md` as the list of unfinished work only.
5. When a task is done, remove it from `open.md` and add a concise completed entry to `completed.md`.
6. If a task changes specifications, architecture, security, API, DB, E2E, or UI requirements, include the relevant document update in the task or perform it in the same work.
7. After task document edits, run the unresolved-marker check documented in `AGENTS.md`.

## Open Task Format

Prefer this shape:

```md
- [ ] <task title>
  - 目的: <why this matters>
  - 対象: `<main files or areas>`
  - 対応: <expected work>
  - 完了条件: <verification or acceptance criteria>
  - 根拠: <source document, review item, scan report, or user request>
```

Use fewer subitems for simple tasks, but always keep enough context for a later agent to execute without rereading the whole conversation.

## Prioritization

- Preserve explicit source priorities such as A/B/C when present.
- If no priority is given, order by risk and dependency: architecture/security first, then shared infrastructure, then feature organization, then cleanup.
- Split large refactors into smaller tasks only when they can be done independently.
