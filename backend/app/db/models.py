"""
ORM MODELS.

Two tables. Deliberately few: everything about applicants, applications and
documents is owned by the web app. This service records the work *it* does.

`jobs`             one row per background job. The durable record of what was
                   asked, by whom, and how it ended. Celery's broker is
                   transport, not storage — a Redis restart must not lose the
                   answer to "did that job run".

`ai_interactions`  one row per Claude call: model, token counts, latency, stop
                   reason. Not the prompt and not the output — those can carry
                   applicant data and live (briefly) on the job row, which is
                   scrubbed after `JOB_DATA_RETENTION_DAYS`. Usage and cost
                   questions stay answerable forever; content does not linger.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

# JSONB on Postgres (indexable, compact); plain JSON on SQLite for tests.
JsonType = JSON().with_variant(JSONB(), "postgresql")

JOB_DATA_RETENTION_DAYS = 7


class JobStatus(enum.StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


TERMINAL_STATUSES = frozenset({JobStatus.SUCCEEDED, JobStatus.FAILED})


class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = (
        # Idempotency is per caller: two staff members may legitimately choose
        # the same key. NULL keys never collide (Postgres treats NULLs as
        # distinct), so jobs without a key are unaffected.
        UniqueConstraint("requested_by_type", "requested_by_id", "idempotency_key"),
        Index(None, "status", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    kind: Mapped[str] = mapped_column(String(64))
    status: Mapped[JobStatus] = mapped_column(
        # A VARCHAR with a CHECK rather than a native enum type: adding a status
        # later is then a constraint change, not `ALTER TYPE … ADD VALUE`, which
        # cannot run inside a transaction on older Postgres.
        Enum(
            JobStatus,
            name="job_status",
            native_enum=False,
            create_constraint=True,
            length=16,
            values_callable=lambda members: [member.value for member in members],
        ),
        default=JobStatus.QUEUED,
    )

    requested_by_type: Mapped[str] = mapped_column(String(16))
    requested_by_id: Mapped[str] = mapped_column(String(64))
    idempotency_key: Mapped[str | None] = mapped_column(String(128))
    # SHA-256 of the canonical request. Survives the payload being scrubbed, so a
    # replayed idempotency key can still be checked against what it first meant.
    fingerprint: Mapped[str] = mapped_column(String(64))

    payload: Mapped[dict[str, Any]] = mapped_column(JsonType)
    result: Mapped[dict[str, Any] | None] = mapped_column(JsonType)
    error_code: Mapped[str | None] = mapped_column(String(64))
    attempts: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    data_expired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AiInteraction(Base):
    __tablename__ = "ai_interactions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("jobs.id", ondelete="CASCADE"), index=True
    )
    model: Mapped[str] = mapped_column(String(128))
    stop_reason: Mapped[str | None] = mapped_column(String(32))
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
