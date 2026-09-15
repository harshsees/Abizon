"""
Running async service code from synchronous Celery tasks.

Celery's prefork worker is synchronous; the services are async. Each task runs
its coroutine in a fresh event loop with `asyncio.run`, and the worker's
database uses `NullPool` — a pooled asyncpg connection belongs to the loop that
opened it and would be unusable from the next task's loop.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from collections.abc import Coroutine, Iterator
from contextlib import contextmanager
from typing import Any

from app.core.config import get_settings
from app.core.logging import request_id_scope, timed
from app.db.session import Database

log = logging.getLogger("app.worker")

_database: Database | None = None


def worker_database() -> Database:
    global _database
    if _database is None:
        settings = get_settings()
        if not settings.database_url:
            raise RuntimeError("DATABASE_URL is not set; the worker cannot record jobs.")
        _database = Database(settings.database_url, pooled=False)
    return _database


def run_async[T](coroutine: Coroutine[Any, Any, T]) -> T:
    return asyncio.run(coroutine)


@contextmanager
def task_context(name: str, *, request_id: str | None = None, **fields: object) -> Iterator[None]:
    """Binds the originating request id (so the web request, the API call and
    the task share one id in the logs) and records duration and outcome."""
    with request_id_scope(request_id or uuid.uuid4().hex), timed(log, f"task.{name}", **fields):
        yield
