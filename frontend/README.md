# Kakeibo Frontend

Next.js App Router based frontend skeleton for the kakeibo app.

## Scope

- This package owns only files under `frontend/`.
- DTOs are represented in snake_case to match the API contract.
- OpenAPI generated clients live under `src/lib/generated/`.
- Dark mode is intentionally not implemented in this initial skeleton.

## Setup

Dependencies are declared in `package.json`, but are not installed by this initial scaffold.

```bash
npm install
npm run dev
```

## App Routes

- `/` redirects to `/dashboard`
- `/dashboard`
- `/calendar`
- `/transactions`
- `/categories`
- `/upload`
- `/settings`
- `/login`

`/reports` is kept only as a compatibility redirect to `/dashboard`.

## Notes For API Integration

Use `src/lib/api.ts` as the handwritten adapter layer around the generated OpenAPI client. Keep generated files isolated under `src/lib/generated/` so application code can import stable functions from `src/lib/api.ts`.

To regenerate the client from FastAPI OpenAPI, run:

```bash
docker compose run --rm backend python scripts/generate_openapi_client.py
```
