"""
JOB ROUTES — queue work, poll for the result.

    POST /v1/jobs/ai-completions   202 + job (queued)     Idempotency-Key optional
    GET  /v1/jobs/{id}             the job, with `result` once it has succeeded

Asynchronous on purpose. A Claude call can take tens of seconds; holding an
HTTP request open for that long ties up a worker slot here and a function in
the web app, and a dropped connection would lose a result that was paid for.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request, Response, status

from app.api.deps import authorize, job_service, rate_limit, require_permission
from app.core.exceptions import NotFound
from app.core.logging import current_request_id
from app.core.security import Principal
from app.schemas.jobs import AiCompletionIn, JobOut
from app.services.jobs import JobService

router = APIRouter(prefix="/jobs", tags=["jobs"])

Jobs = Annotated[JobService, Depends(job_service)]


@router.post(
    "/ai-completions",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(rate_limit("ai.jobs"))],
)
async def create_ai_completion(
    body: AiCompletionIn,
    request: Request,
    response: Response,
    principal: Annotated[Principal, Depends(require_permission("ai.invoke"))],
    jobs: Jobs,
    idempotency_key: Annotated[
        str | None, Header(alias="Idempotency-Key", pattern=r"^[A-Za-z0-9_.:-]{8,128}$")
    ] = None,
) -> JobOut:
    authorize(principal, "jobs.create")

    job, created = await jobs.create(
        kind="ai.completion",
        payload=body.model_dump(exclude_none=True),
        principal=principal,
        idempotency_key=idempotency_key,
    )

    response.headers["Location"] = f"/v1/jobs/{job.id}"
    if created:
        # After the commit inside `create`, never before: see `app/services/jobs.py`.
        await request.app.state.enqueue(job.id, job.kind, current_request_id())
    else:
        response.status_code = status.HTTP_200_OK

    return JobOut.model_validate(job)


@router.get("/{job_id}", dependencies=[Depends(rate_limit("jobs.read"))])
async def get_job(
    job_id: uuid.UUID,
    principal: Annotated[Principal, Depends(require_permission("jobs.read"))],
    jobs: Jobs,
) -> JobOut:
    job = await jobs.get_visible(job_id, principal)
    if job is None:
        raise NotFound("No such job.")
    return JobOut.model_validate(job)
