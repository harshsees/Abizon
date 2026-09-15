"""
ENGINE, SESSIONS, AND THE UNIT OF WORK.

ACID in practice comes down to one rule in this codebase: **every write happens
inside `unit_of_work()`**, and a unit of work is exactly one transaction.

    async with database.unit_of_work() as session:
        job = await session.get(Job, job_id, with_for_update=True)
        job.status = JobStatus.SUCCEEDED
        session.add(AiInteraction(...))
    # committed here — both rows or neither

  Atomicity    leaving the block commits; an exception anywhere inside rolls
               back everything, including rows already flushed.
  Consistency  constraints (unique idempotency key, FK, status CHECK) are
               enforced by Postgres at commit, not by hoping.
  Isolation    Postgres READ COMMITTED, plus `SELECT … FOR UPDATE` where two
               workers could race for the same row (see `JobService.claim`).
  Durability   RDS: synchronous WAL, automated backups, Multi-AZ when enabled.

It is a context manager because the alternative — `commit()` and `rollback()`
called by hand — is correct only on the paths somebody remembered, and the
forgotten path is always the exception.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.db.base import SCHEMA


class Database:
    def __init__(self, url: str, *, pooled: bool = True, pool_size: int = 5) -> None:
        options: dict[str, Any] = {}

        if url.startswith("sqlite"):
            # Tests only. SQLite has no schemas, so `svc.jobs` is mapped to `jobs`.
            options["execution_options"] = {"schema_translate_map": {SCHEMA: None}}
        else:
            options["connect_args"] = {
                "server_settings": {
                    "application_name": "abizon-backend",
                    # A query that has not returned in 15s is holding a pooled
                    # connection hostage. Fail it and let the caller retry.
                    "statement_timeout": "15000",
                },
                "timeout": 10,
            }
            if pooled:
                options.update(
                    pool_size=pool_size,
                    max_overflow=pool_size,
                    pool_pre_ping=True,
                    # RDS and any NAT in between drop idle connections silently.
                    pool_recycle=1800,
                )

        if not pooled:
            # Celery tasks each run their own event loop (`asyncio.run`), and a
            # pooled asyncpg connection is bound to the loop that opened it.
            options["poolclass"] = NullPool

        self.engine: AsyncEngine = create_async_engine(url, **options)
        self._sessions = async_sessionmaker(self.engine, expire_on_commit=False)

    @asynccontextmanager
    async def unit_of_work(self) -> AsyncIterator[AsyncSession]:
        async with self._sessions() as session, session.begin():
            yield session

    @asynccontextmanager
    async def read_only(self) -> AsyncIterator[AsyncSession]:
        """For reads. Nothing is committed: closing the session releases the
        connection and rolls its transaction back, so an accidental write inside
        cannot persist. (Not an explicit `rollback()`, which would also expire
        every loaded object and make the rows just read unusable.)"""
        async with self._sessions() as session:
            yield session

    async def ping(self) -> None:
        async with self.engine.connect() as connection:
            await connection.execute(text("select 1"))

    async def dispose(self) -> None:
        await self.engine.dispose()
