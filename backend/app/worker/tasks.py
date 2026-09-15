"""
TASKS.

Each task is a thin synchronous shell around an async function that does the
work. The async functions take their collaborators as arguments, which is what
lets the tests run them against SQLite, moto and a fake model without Celery.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import timedelta
from typing import Any, Literal

import httpx
from celery import Task

from app.core.config import get_settings
from app.services.ai import AiError, AiRefused, AiService, RetryableAiError
from app.services.jobs import JobService
from app.services.storage import StorageService
from app.worker.celery_app import celery_app
from app.worker.runtime import run_async, task_context, worker_database

log = logging.getLogger(__name__)

WEB_CRON_JOBS = frozenset({"purge", "retention"})

Outcome = Literal["succeeded", "failed", "retry", "skipped"]

_ai_service: AiService | None = None


def ai_service() -> AiService:
    # One client per worker process: it holds the HTTP connection pool.
    global _ai_service
    if _ai_service is None:
        _ai_service = AiService(get_settings())
    return _ai_service


# --- AI completion ----------------------------------------------------------------


async def execute_ai_completion(
    job_id: uuid.UUID, jobs: JobService, ai: Any, *, final_attempt: bool
) -> Outcome:
    claimed = await jobs.claim(job_id)
    if claimed is None:
        # Finished already, or another worker holds it. A redelivered message
        # must not become a second paid model call.
        return "skipped"

    payload = claimed.payload
    try:
        completion = await asyncio.to_thread(
            ai.complete,
            prompt=payload["prompt"],
            system=payload.get("system"),
            max_tokens=payload.get("max_tokens"),
        )
    except RetryableAiError:
        if final_attempt:
            await jobs.fail(job_id, RetryableAiError.code)
            return "failed"
        await jobs.release_for_retry(job_id)
        return "retry"
    except AiRefused as exc:
        await jobs.fail(job_id, exc.code)
        return "failed"
    except AiError:
        await jobs.fail(job_id, AiError.code)
        return "failed"
    except Exception:
        log.exception("ai completion crashed", extra={"job_id": str(job_id)})
        await jobs.fail(job_id, "internal_error")
        return "failed"

    await jobs.succeed(
        job_id,
        result={"text": completion.text, "model": completion.model, "stop_reason": completion.stop_reason},
        interaction={
            "model": completion.model,
            "stop_reason": completion.stop_reason,
            "input_tokens": completion.input_tokens,
            "output_tokens": completion.output_tokens,
            "latency_ms": completion.latency_ms,
        },
    )
    return "succeeded"


@celery_app.task(name="ai.run_completion", bind=True, max_retries=5)
def run_ai_completion(self: Task, job_id: str, request_id: str | None = None) -> str:
    final_attempt = self.request.retries >= (self.max_retries or 0)
    with task_context(self.name, request_id=request_id, attempt=self.request.retries):
        outcome = run_async(
            execute_ai_completion(
                uuid.UUID(job_id), JobService(worker_database()), ai_service(), final_attempt=final_attempt
            )
        )
    if outcome == "retry":
        # Exponential backoff: 4s, 8s, 16s, 32s, 64s. Bedrock throttling clears
        # in seconds to minutes.
        raise self.retry(countdown=min(300, 2 ** (self.request.retries + 2)))
    return outcome


TASKS_BY_KIND: dict[str, Task] = {"ai.completion": run_ai_completion}


# --- Maintenance -------------------------------------------------------------------


@celery_app.task(name="maintenance.purge_incoming")
def purge_incoming() -> int:
    settings = get_settings()
    if not settings.s3_bucket:
        return 0
    with task_context("maintenance.purge_incoming"):
        return run_async(
            StorageService(settings).purge_older_than(
                "incoming", timedelta(seconds=settings.incoming_max_age_seconds)
            )
        )


@celery_app.task(name="maintenance.requeue_stale_jobs")
def requeue_stale_jobs() -> int:
    with task_context("maintenance.requeue_stale_jobs"):
        stale = run_async(JobService(worker_database()).stale_jobs())
        for job_id, kind in stale:
            task = TASKS_BY_KIND.get(kind)
            if task is None:
                log.error("stale job of unknown kind", extra={"job_id": str(job_id), "kind": kind})
                continue
            task.apply_async(args=[str(job_id)], task_id=str(job_id))
        return len(stale)


@celery_app.task(name="maintenance.expire_job_data")
def expire_job_data() -> int:
    with task_context("maintenance.expire_job_data"):
        return run_async(JobService(worker_database()).expire_finished_data())


@celery_app.task(name="maintenance.call_web_cron", bind=True, max_retries=3)
def call_web_cron(self: Task, job: str) -> int:
    """Triggers the web app's `/api/cron/<job>` route, authenticated with the
    same `Authorization: Bearer $CRON_SECRET` the route already checks."""
    if job not in WEB_CRON_JOBS:
        raise ValueError(f"Unknown web cron job {job!r}")

    settings = get_settings()
    if not settings.web_internal_url or not settings.cron_secret:
        log.warning("web cron skipped: WEB_INTERNAL_URL or CRON_SECRET not set", extra={"job": job})
        return 0

    with task_context(f"maintenance.call_web_cron.{job}"):
        try:
            response = httpx.get(
                f"{settings.web_internal_url.rstrip('/')}/api/cron/{job}",
                headers={"Authorization": f"Bearer {settings.cron_secret.get_secret_value()}"},
                timeout=120.0,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise self.retry(exc=exc, countdown=60) from exc
        return response.status_code
