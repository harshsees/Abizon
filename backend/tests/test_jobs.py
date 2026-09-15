import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError

from app.core.security import Principal
from app.db.models import AiInteraction, Job, JobStatus
from app.services.jobs import JobService

STAFF = Principal(id="staff-1", type="staff", role="processor", token_id="t")


# --- API ------------------------------------------------------------------------------


async def test_processor_queues_a_completion(app, client, auth) -> None:
    response = await client.post("/v1/jobs/ai-completions", json={"prompt": "Summarise"}, headers=auth("processor"))
    assert response.status_code == 202, response.text
    body = response.json()
    assert body["status"] == "queued"
    assert response.headers["location"] == f"/v1/jobs/{body['id']}"
    assert app.state.enqueued == [(uuid.UUID(body["id"]), "ai.completion")]


async def test_idempotent_replay_returns_the_same_job_and_does_not_enqueue_twice(app, client, auth) -> None:
    headers = {**auth("processor", subject="staff-7"), "Idempotency-Key": "ops-note-00001"}
    first = await client.post("/v1/jobs/ai-completions", json={"prompt": "Summarise"}, headers=headers)
    second = await client.post("/v1/jobs/ai-completions", json={"prompt": "Summarise"}, headers=headers)

    assert first.status_code == 202
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]
    assert len(app.state.enqueued) == 1


async def test_reusing_a_key_for_a_different_request_conflicts(client, auth) -> None:
    headers = {**auth("processor", subject="staff-8"), "Idempotency-Key": "ops-note-00002"}
    await client.post("/v1/jobs/ai-completions", json={"prompt": "One"}, headers=headers)
    response = await client.post("/v1/jobs/ai-completions", json={"prompt": "Two"}, headers=headers)
    assert response.status_code == 409


@pytest.mark.parametrize("role", ["viewer", "applicant"])
async def test_lower_roles_cannot_invoke_the_model(client, auth, role) -> None:
    response = await client.post("/v1/jobs/ai-completions", json={"prompt": "x"}, headers=auth(role))
    assert response.status_code == 403


async def test_applicant_cannot_see_someone_elses_job(client, auth) -> None:
    created = await client.post("/v1/jobs/ai-completions", json={"prompt": "x"}, headers=auth("processor"))
    job_id = created.json()["id"]

    assert (await client.get(f"/v1/jobs/{job_id}", headers=auth())).status_code == 404
    assert (await client.get(f"/v1/jobs/{job_id}", headers=auth("viewer"))).status_code == 200


# --- Service: the ACID properties ------------------------------------------------------


async def _new_job(service: JobService) -> Job:
    job, _ = await service.create(kind="ai.completion", payload={"prompt": "x"}, principal=STAFF, idempotency_key=None)
    return job


async def test_a_job_is_claimed_once_and_finishes_atomically(database) -> None:
    service = JobService(database)
    job = await _new_job(service)

    claimed = await service.claim(job.id)
    assert claimed is not None and claimed.attempts == 1
    assert await service.claim(job.id) is None  # held by the first claimant

    await service.succeed(
        job.id,
        {"text": "done"},
        interaction={"model": "m", "stop_reason": "end_turn", "input_tokens": 3, "output_tokens": 4, "latency_ms": 5},
    )
    assert await service.claim(job.id) is None  # terminal

    async with database.read_only() as session:
        stored = await session.get(Job, job.id)
        interactions = (await session.scalars(select(AiInteraction))).all()
    assert stored is not None and stored.status == JobStatus.SUCCEEDED
    assert len(interactions) == 1


async def test_a_failed_finish_rolls_back_the_status_change_too(database) -> None:
    service = JobService(database)
    job = await _new_job(service)
    await service.claim(job.id)

    with pytest.raises(IntegrityError):
        # `model` is NOT NULL, so the interaction insert fails at commit...
        await service.succeed(job.id, {"text": "done"}, interaction={"model": None})

    async with database.read_only() as session:
        stored = await session.get(Job, job.id)
    # ...and the job is not left claiming success with no usage recorded.
    assert stored is not None and stored.status == JobStatus.RUNNING
    assert stored.result is None


async def test_expired_data_is_scrubbed_but_the_record_stays(database) -> None:
    service = JobService(database)
    job = await _new_job(service)
    await service.claim(job.id)
    await service.succeed(job.id, {"text": "applicant details"})

    async with database.unit_of_work() as session:
        await session.execute(
            update(Job).where(Job.id == job.id).values(finished_at=datetime.now(UTC) - timedelta(days=8))
        )

    assert await service.expire_finished_data() == 1
    assert await service.expire_finished_data() == 0

    async with database.read_only() as session:
        stored = await session.get(Job, job.id)
    assert stored is not None
    assert stored.payload == {} and stored.result is None
    assert stored.status == JobStatus.SUCCEEDED


async def test_jobs_from_dead_workers_are_requeued(database) -> None:
    service = JobService(database)
    job = await _new_job(service)
    await service.claim(job.id)

    long_ago = datetime.now(UTC) - timedelta(hours=1)
    async with database.unit_of_work() as session:
        await session.execute(update(Job).where(Job.id == job.id).values(started_at=long_ago, created_at=long_ago))

    assert await service.stale_jobs() == [(job.id, "ai.completion")]
    assert await service.claim(job.id) is not None
