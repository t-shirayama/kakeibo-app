from __future__ import annotations

from collections.abc import Iterator

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.infrastructure.models import Base


@pytest.fixture
def sqlite_session_factory() -> Iterator[sessionmaker]:
    # リポジトリテストはMySQLに依存させず、インメモリSQLiteで永続化境界だけを検証する。
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, class_=Session)
    yield SessionLocal
    Base.metadata.drop_all(engine)


@pytest.fixture
def db_session(sqlite_session_factory: sessionmaker) -> Iterator[Session]:
    SessionLocal = sqlite_session_factory
    with SessionLocal() as session:
        yield session
