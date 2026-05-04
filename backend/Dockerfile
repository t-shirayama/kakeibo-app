FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app/backend

RUN python -m pip install --upgrade pip

COPY pyproject.toml ./
COPY requirements.lock ./
COPY app ./app
RUN python -m pip install -r requirements.lock && python -m pip install -e . --no-deps

COPY alembic.ini ./
COPY alembic ./alembic

EXPOSE 8000
