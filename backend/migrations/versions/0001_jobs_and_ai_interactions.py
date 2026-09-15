"""jobs and ai_interactions

Revision ID: 0001
Revises:
Create Date: 2026-09-15

Hand-written to match `app/db/models.py`, with constraint names spelled out so
they agree with the naming convention in `app/db/base.py`.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SCHEMA = "svc"


def upgrade() -> None:
    op.execute(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA}")

    op.create_table(
        "jobs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("requested_by_type", sa.String(length=16), nullable=False),
        sa.Column("requested_by_id", sa.String(length=64), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=True),
        sa.Column("fingerprint", sa.String(length=64), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("result", postgresql.JSONB(), nullable=True),
        sa.Column("error_code", sa.String(length=64), nullable=True),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("data_expired_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id", name="pk_jobs"),
        sa.UniqueConstraint(
            "requested_by_type",
            "requested_by_id",
            "idempotency_key",
            name="uq_jobs_requested_by_type_requested_by_id_idempotency_key",
        ),
        sa.CheckConstraint(
            "status IN ('queued', 'running', 'succeeded', 'failed')",
            # op.f: a final name. Without it the naming convention's `ck_` prefix
            # is applied a second time, giving `ck_jobs_ck_jobs_job_status`.
            name=op.f("ck_jobs_job_status"),
        ),
        schema=SCHEMA,
    )
    op.create_index("ix_jobs_status_created_at", "jobs", ["status", "created_at"], schema=SCHEMA)

    op.create_table(
        "ai_interactions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("job_id", sa.Uuid(), nullable=False),
        sa.Column("model", sa.String(length=128), nullable=False),
        sa.Column("stop_reason", sa.String(length=32), nullable=True),
        sa.Column("input_tokens", sa.Integer(), nullable=False),
        sa.Column("output_tokens", sa.Integer(), nullable=False),
        sa.Column("latency_ms", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_ai_interactions"),
        sa.ForeignKeyConstraint(
            ["job_id"],
            [f"{SCHEMA}.jobs.id"],
            name="fk_ai_interactions_job_id_jobs",
            ondelete="CASCADE",
        ),
        schema=SCHEMA,
    )
    op.create_index("ix_ai_interactions_job_id", "ai_interactions", ["job_id"], schema=SCHEMA)


def downgrade() -> None:
    op.drop_index("ix_ai_interactions_job_id", table_name="ai_interactions", schema=SCHEMA)
    op.drop_table("ai_interactions", schema=SCHEMA)
    op.drop_index("ix_jobs_status_created_at", table_name="jobs", schema=SCHEMA)
    op.drop_table("jobs", schema=SCHEMA)
