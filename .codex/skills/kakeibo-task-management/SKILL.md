---
name: kakeibo-task-management
description: Use when adding, organizing, prioritizing, completing, or moving project tasks in docs/requirements/backlog from user requests, review notes, scan results, or planning documents.
---

# Kakeibo Task Management

## Scope

Use this skill whenever a request is to add tasks, turn findings into tasks, update task state, or review `docs/requirements/backlog/`.

## Workflow

1. Read `docs/requirements/backlog/README.md`, the relevant state folder README, and any source document or user notes.
2. Check `docs/requirements/backlog/pending/`, `docs/requirements/backlog/in-progress/`, and `docs/requirements/backlog/archive/` for duplicates before adding tasks.
3. Add only implementation or documentation tasks that are actionable. Do not add vague observations without an expected outcome.
4. Manage one task per Markdown file. New unfinished tasks go under `docs/requirements/backlog/pending/`.
5. When a task starts, move its file to `docs/requirements/backlog/in-progress/` and update both folder indexes.
6. When a task is done, add a concise completed entry to `docs/requirements/backlog/archive/YYYY-MM.md`, remove the task file, and update the folder indexes.
7. If a task changes specifications, architecture, security, API, DB, E2E, or UI requirements, include the relevant document update in the task or perform it in the same work.
8. After task document edits, run the unresolved-marker check documented in `AGENTS.md`.

## Task File Format

Prefer this shape:

```md
# <task title>

## 状態

未対応

## 優先度

<A/B/C or reason>

## 目的

<why this matters>

## 対象

<main files or areas>

## 対応内容

<expected work>

## 完了条件

<verification or acceptance criteria>

## 根拠

<source document, review item, scan report, or user request>
```

Use fewer details for simple tasks, but always keep enough context for a later agent to execute without rereading the whole conversation.

## Prioritization

- Preserve explicit source priorities such as A/B/C when present.
- If no priority is given, order by risk and dependency: architecture/security first, then shared infrastructure, then feature organization, then cleanup.
- Split large refactors into smaller tasks only when they can be done independently.
