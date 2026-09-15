from datetime import timedelta

import pytest

from app.core.security import Principal
from app.db.models import AiInteraction, Job, JobStatus
from app.services.ai import AiRefused, Completion, RetryableAiError
from app.services.jobs import JobService
from app.services.storage import StorageService
from app.worker.celery_app import celery_app
from app.worker.tasks import call_web_cron, execute_ai_completion
from tests.conftest import BUCKET

STAFF = Principal(id="staff-1", type="staff", role="processor", token_id="t")


class FakeAi:
    def __init__(self, outcome):
        self.outcome = outcome
        self.calls = 0

    def complete(self, **_):
        self.calls += 1
        if isinstance(self.outcome, Exception):
            raise self.outcome
        return self.outcome


COMPLETION = Completion(
    text="Summary.", model="anthropic.claude-opus-5", stop_reason="end_turn",
    input_tokens=120, output_tokens=40, latency_ms=900,
)


async def _job(database) -> Job:
    job, _ = await JobService(database).create(
        kind="ai.completion", payload={"prompt": "Summarise"}, principal=STAFF, idempotency_key=None
    )
    return job


async def _status(database, job_id):
    async with database.read_only() as session:
        return (await session.get(Job, job_id)).status


async def test_success_records_result_and_usage(database) -> None:
    job = await _job(database)
    outcome = await execute_ai_completion(job.id, JobService(database), FakeAi(COMPLETION), final_attempt=False)

    assert outcome == "succeeded"
    async with database.read_only() as session:
        stored = await session.get(Job, job.id)
        usage = await session.scalar(AiInteraction.__table__.select())
    assert stored.result["text"] == "Summary."
    assert usage is not None


async def test_throttling_releases_the_job_until_the_last_attempt(database) -> None:
    job = await _job(database)
    jobs = JobService(database)

    assert await execute_ai_completion(job.id, jobs, FakeAi(RetryableAiError()), final_attempt=False) == "retry"
    assert await _status(database, job.id) == JobStatus.QUEUED

    assert await execute_ai_completion(job.id, jobs, FakeAi(RetryableAiError()), final_attempt=True) == "failed"
    assert await _status(database, job.id) == JobStatus.FAILED


async def test_refusal_fails_without_retrying(database) -> None:
    job = await _job(database)
    outcome = await execute_ai_completion(job.id, JobService(database), FakeAi(AiRefused("cyber")), final_attempt=False)
    assert outcome == "failed"
    async with database.read_only() as session:
        assert (await session.get(Job, job.id)).error_code == "ai_refused"


async def test_redelivered_message_does_not_call_the_model_twice(database) -> None:
    job = await _job(database)
    jobs = JobService(database)
    await jobs.claim(job.id)  # the first delivery is still running

    ai = FakeAi(COMPLETION)
    assert await execute_ai_completion(job.id, jobs, ai, final_attempt=False) == "skipped"
    assert ai.calls == 0


async def test_purge_removes_stale_incoming_objects_only(s3, settings) -> None:
    s3.put_object(Bucket=BUCKET, Key="incoming/a/b/raw-1", Body=b"x")
    s3.put_object(Bucket=BUCKET, Key="documents/a/b/doc-1.jpg", Body=b"x")

    # A negative age makes "older than" include objects written a moment ago.
    removed = await StorageService(settings).purge_older_than("incoming", timedelta(seconds=-60))

    assert removed == 1
    assert s3.list_objects_v2(Bucket=BUCKET, Prefix="documents/")["KeyCount"] == 1
    assert s3.list_objects_v2(Bucket=BUCKET, Prefix="incoming/")["KeyCount"] == 0


def test_web_cron_only_calls_known_routes() -> None:
    with pytest.raises(ValueError):
        call_web_cron.run("drop-everything")


def test_beat_schedule_names_registered_tasks() -> None:
    for entry in celery_app.conf.beat_schedule.values():
        assert entry["task"] in celery_app.tasks
