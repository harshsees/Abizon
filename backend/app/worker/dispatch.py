"""
Sending jobs to the broker.

`apply_async` talks to Redis over a blocking socket, so the API calls it through
`asyncio.to_thread`. A failure is logged and swallowed: the job row is already
committed as `queued`, and `maintenance.requeue_stale_jobs` re-sends anything
still queued after five minutes. The caller gets its 202 either way.
"""

from __future__ import annotations

import asyncio
import logging
import uuid

log = logging.getLogger(__name__)


def task_for_kind(kind: str):  # type: ignore[no-untyped-def]
    from app.worker.tasks import TASKS_BY_KIND

    return TASKS_BY_KIND[kind]


def send_job(job_id: uuid.UUID, kind: str, request_id: str | None = None) -> None:
    task_for_kind(kind).apply_async(
        args=[str(job_id)], kwargs={"request_id": request_id}, task_id=str(job_id)
    )


async def enqueue_job(job_id: uuid.UUID, kind: str, request_id: str | None) -> None:
    try:
        await asyncio.to_thread(send_job, job_id, kind, request_id)
    except Exception:
        log.exception("could not enqueue job; it will be re-sent", extra={"job_id": str(job_id)})
