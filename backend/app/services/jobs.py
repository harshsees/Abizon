"""
JOBS — the durable half of background work.

Celery moves a job id from the API to a worker. Postgres holds everything
about the job. The split is what makes the system survive its own failures:

  * **Enqueue after commit.** The row is committed first, then the id is sent to
    the broker. A worker can never receive an id for a row it cannot see. If the
    send fails, the row is still `queued` and `requeue_stale` re-sends it.
  * **Claim under a row lock.** `SELECT … FOR UPDATE` means two workers handed
    the same message (Celery is at-least-once with `acks_late`) cannot both run
    a paid model call: the second waits, then sees `running` and backs off.
  * **Finish atomically.** The status change and the `ai_interactions` row are
    one transaction. There is no state in which a job reads `succeeded` with no
    usage recorded, or usage is recorded against a job still `running`.
  * **Idempotency keys.** A client that retries a POST after a timeout gets the
    same job back instead of paying twice.
"""

from __future__ import annotations

import hashlib
import json
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError

from app.core.exceptions import Conflict
from app.core.security import Principal
from app.db.models import JOB_DATA_RETENTION_DAYS, TERMINAL_STATUSES, AiInteraction, Job, JobStatus
from app.db.session import Database

# A job `running` for longer than this belongs to a worker that died.
RUNNING_LEASE = timedelta(minutes=15)
# A job still `queued` after this was probably never delivered to the broker.
QUEUED_GRACE = timedelta(minutes=5)


def fingerprint(kind: str, payload: dict[str, Any]) -> str:
    canonical = json.dumps({"kind": kind, "payload": payload}, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode()).hexdigest()


@dataclass(frozen=True, slots=True)
class ClaimedJob:
    id: uuid.UUID
    kind: str
    payload: dict[str, Any]
    attempts: int


class JobService:
    def __init__(self, database: Database) -> None:
        self._db = database

    async def create(
        self,
        *,
        kind: str,
        payload: dict[str, Any],
        principal: Principal,
        idempotency_key: str | None,
    ) -> tuple[Job, bool]:
        """Returns `(job, created)`. `created` is False for an idempotent replay."""
        digest = fingerprint(kind, payload)

        if idempotency_key:
            existing = await self._find_by_key(principal, idempotency_key)
            if existing is not None:
                return self._replay(existing, digest), False

        try:
            async with self._db.unit_of_work() as session:
                job = Job(
                    kind=kind,
                    status=JobStatus.QUEUED,
                    requested_by_type=principal.type,
                    requested_by_id=principal.id,
                    idempotency_key=idempotency_key,
                    fingerprint=digest,
                    payload=payload,
                    attempts=0,
                )
                session.add(job)
                # Load server defaults (created_at) while the session is open, so
                # the caller can serialise the job without a second query.
                await session.flush()
                await session.refresh(job)
            return job, True
        except IntegrityError:
            # Two identical requests raced past the lookup above; the unique
            # constraint let exactly one commit. Return that one.
            if not idempotency_key:
                raise
            existing = await self._find_by_key(principal, idempotency_key)
            if existing is None:
                raise
            return self._replay(existing, digest), False

    async def _find_by_key(self, principal: Principal, key: str) -> Job | None:
        async with self._db.read_only() as session:
            return await session.scalar(
                select(Job).where(
                    Job.requested_by_type == principal.type,
                    Job.requested_by_id == principal.id,
                    Job.idempotency_key == key,
                )
            )

    @staticmethod
    def _replay(existing: Job, digest: str) -> Job:
        if existing.fingerprint != digest:
            raise Conflict("That idempotency key was already used for a different request.")
        return existing

    async def get_visible(self, job_id: uuid.UUID, principal: Principal) -> Job | None:
        """Staff and system see every job; an applicant sees only their own.
        Someone else's job is reported as not existing, not as forbidden."""
        async with self._db.read_only() as session:
            job = await session.get(Job, job_id)
        if job is None:
            return None
        if principal.type == "applicant" and (
            job.requested_by_type != "applicant" or job.requested_by_id != principal.id
        ):
            return None
        return job

    # --- Worker side ---------------------------------------------------------------

    async def claim(self, job_id: uuid.UUID) -> ClaimedJob | None:
        now = datetime.now(UTC)
        async with self._db.unit_of_work() as session:
            job = await session.scalar(select(Job).where(Job.id == job_id).with_for_update())
            if job is None or job.status in TERMINAL_STATUSES:
                return None
            if job.status == JobStatus.RUNNING and job.started_at and _aware(job.started_at) > now - RUNNING_LEASE:
                return None  # another worker holds it
            job.status = JobStatus.RUNNING
            job.attempts += 1
            job.started_at = now
            return ClaimedJob(job.id, job.kind, dict(job.payload), job.attempts)

    async def release_for_retry(self, job_id: uuid.UUID) -> None:
        async with self._db.unit_of_work() as session:
            await session.execute(
                update(Job)
                .where(Job.id == job_id, Job.status == JobStatus.RUNNING)
                .values(status=JobStatus.QUEUED, started_at=None)
            )

    async def succeed(
        self, job_id: uuid.UUID, result: dict[str, Any], interaction: dict[str, Any] | None = None
    ) -> None:
        async with self._db.unit_of_work() as session:
            job = await session.scalar(select(Job).where(Job.id == job_id).with_for_update())
            if job is None or job.status in TERMINAL_STATUSES:
                return
            job.status = JobStatus.SUCCEEDED
            job.result = result
            job.error_code = None
            job.finished_at = datetime.now(UTC)
            if interaction is not None:
                session.add(AiInteraction(job_id=job_id, **interaction))

    async def fail(
        self, job_id: uuid.UUID, error_code: str, interaction: dict[str, Any] | None = None
    ) -> None:
        async with self._db.unit_of_work() as session:
            job = await session.scalar(select(Job).where(Job.id == job_id).with_for_update())
            if job is None or job.status in TERMINAL_STATUSES:
                return
            job.status = JobStatus.FAILED
            job.error_code = error_code
            job.finished_at = datetime.now(UTC)
            if interaction is not None:
                session.add(AiInteraction(job_id=job_id, **interaction))

    # --- Maintenance -----------------------------------------------------------

    async def stale_jobs(self, limit: int = 100) -> list[tuple[uuid.UUID, str]]:
        """`(id, kind)` for jobs queued too long (lost on the way to the broker)
        or running past the lease (worker died). Running ones are put back to
        queued in the same transaction, so they are claimable when re-sent."""
        now = datetime.now(UTC)
        async with self._db.unit_of_work() as session:
            await session.execute(
                update(Job)
                .where(Job.status == JobStatus.RUNNING, Job.started_at < now - RUNNING_LEASE)
                .values(status=JobStatus.QUEUED, started_at=None)
            )
            rows = await session.execute(
                select(Job.id, Job.kind)
                .where(Job.status == JobStatus.QUEUED, Job.created_at < now - QUEUED_GRACE)
                .order_by(Job.created_at)
                .limit(limit)
            )
            return [(row.id, row.kind) for row in rows]

    async def expire_finished_data(self) -> int:
        """Scrubs prompts and outputs from finished jobs after the retention
        period. The row, its status and its usage stay."""
        cutoff = datetime.now(UTC) - timedelta(days=JOB_DATA_RETENTION_DAYS)
        async with self._db.unit_of_work() as session:
            outcome = await session.execute(
                update(Job)
                .where(
                    Job.status.in_(TERMINAL_STATUSES),
                    Job.finished_at < cutoff,
                    Job.data_expired_at.is_(None),
                )
                .values(payload={}, result=None, data_expired_at=datetime.now(UTC))
            )
            return int(getattr(outcome, "rowcount", 0) or 0)


def _aware(value: datetime) -> datetime:
    # SQLite (tests) returns naive datetimes; Postgres returns aware ones.
    return value if value.tzinfo else value.replace(tzinfo=UTC)
