# kakeibo backend

FastAPI + DDD skeleton for the kakeibo app.

## Stack

- FastAPI, OpenAPI/Swagger as the API contract
- MySQL 8.4
- SQLAlchemy 2.x + Alembic
- PyJWT
- PyMuPDF for PDF import

## Layout

```text
app/
  domain/          # Entities, value objects, repository protocols
  application/     # Use cases and application services
  infrastructure/  # DB, SQLAlchemy models, external adapters, parsers
  presentation/    # FastAPI routers and HTTP schemas
```

## Local run

Dependencies are not installed by this scaffold. After installing them in your preferred environment:

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload
```

Swagger UI is available at `/docs`.

When backend dependencies change, activate the same virtual environment and run `python -m pip install -e ".[dev]"` again. The dependency set includes `cryptography` for MySQL 8.4 `caching_sha2_password` authentication through PyMySQL.

## Sample user

`alembic upgrade head` inserts local verification sample data.

- Email: `sample@example.com`
- Password: `SamplePassw0rd!`

## Conventions

- Amounts are integer JPY. Negative amounts represent cancellations or reversals, and zero yen is valid.
- DB timestamps are UTC. Presentation formatting should convert to Asia/Tokyo.
- JWT is designed for HttpOnly cookies.
  - access token: 15 minutes
  - refresh token: 5 days
  - refresh token rotation is required for login refresh flows
- CSRF token endpoint: `GET /api/auth/csrf`
  - token is returned in the response body only
  - unsafe methods should validate a CSRF request header in later middleware/dependencies
- PDF import will use PyMuPDF with rule-based parser adapters under `app/infrastructure/parsers`.

## Alembic

```bash
cd backend
alembic revision --autogenerate -m "init"
alembic upgrade head
```
