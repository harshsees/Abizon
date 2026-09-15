"""
Test fixtures. No network, no Docker: SQLite stands in for Postgres, moto for
S3, an in-memory limiter for Redis, and a list for the Celery broker.

What that cannot prove — `FOR UPDATE` blocking, JSONB, the real migration — is
covered by running the suite against docker-compose's Postgres (see README).
"""

from __future__ import annotations

import os

# Before anything imports boto3 or the settings.
os.environ["ENVIRONMENT"] = "test"
os.environ["AWS_ACCESS_KEY_ID"] = "testing"
os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
os.environ["AWS_SESSION_TOKEN"] = "testing"
os.environ["AWS_DEFAULT_REGION"] = "ap-south-1"

import uuid
from collections.abc import AsyncIterator, Callable, Iterator
from typing import Any

import boto3
import httpx
import pytest
from fastapi import FastAPI
from moto import mock_aws

from app.core.config import Settings
from app.core.security import PrincipalType, issue_service_token
from app.db.base import Base
from app.db.session import Database
from app.main import create_app
from app.services.aws import s3_client
from app.services.rate_limit import MemoryRateLimiter
from app.services.storage import StorageService

BUCKET = "abizon-test-documents"
REGION = "ap-south-1"
APPLICATION_ID = "0b7f2f5e-4a57-4f45-9f55-8f4cf1f8a001"
TRAVELLER_ID = "5d2c6a1e-3b8f-4c1d-9e7a-2f6b8c9d0e11"
PREFIX = f"{APPLICATION_ID}/{TRAVELLER_ID}/"


@pytest.fixture
def settings(tmp_path: Any) -> Settings:
    return Settings(
        _env_file=None,  # type: ignore[call-arg]
        environment="test",
        database_url=f"sqlite+aiosqlite:///{tmp_path / 'test.db'}",
        redis_url=None,
        s3_bucket=BUCKET,
        aws_region=REGION,
        service_jwt_secret="test-service-secret-that-is-comfortably-long",  # type: ignore[arg-type]
    )


@pytest.fixture
async def database(settings: Settings) -> AsyncIterator[Database]:
    assert settings.database_url
    db = Database(settings.database_url, pooled=False)
    async with db.engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    yield db
    await db.dispose()


@pytest.fixture
def s3() -> Iterator[Any]:
    with mock_aws():
        s3_client.cache_clear()
        client = boto3.client("s3", region_name=REGION)
        client.create_bucket(Bucket=BUCKET, CreateBucketConfiguration={"LocationConstraint": REGION})
        yield client
    s3_client.cache_clear()


@pytest.fixture
async def app(settings: Settings, database: Database, s3: Any) -> AsyncIterator[FastAPI]:
    application = create_app(settings)
    application.state.database = database
    application.state.redis = None
    application.state.rate_limiter = MemoryRateLimiter()
    application.state.storage = StorageService(settings)
    application.state.enqueued = []

    async def enqueue(job_id: uuid.UUID, kind: str, request_id: str | None) -> None:
        application.state.enqueued.append((job_id, kind))

    application.state.enqueue = enqueue

    async with application.router.lifespan_context(application):
        yield application


@pytest.fixture
async def client(app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://api") as http:
        yield http


TokenFactory = Callable[..., dict[str, str]]


@pytest.fixture
def auth(settings: Settings) -> TokenFactory:
    """`auth("viewer")` → an Authorization header for a staff viewer."""

    def make(role: str = "applicant", *, subject: str | None = None, key_prefix: str | None = None) -> dict[str, str]:
        principal_type: PrincipalType = (
            "applicant" if role == "applicant" else "system" if role == "system" else "staff"
        )
        token = issue_service_token(
            settings,
            subject=subject or str(uuid.uuid4()),
            principal_type=principal_type,
            role=role,
            key_prefix=(key_prefix or PREFIX) if principal_type == "applicant" else None,
        )
        return {"Authorization": f"Bearer {token}"}

    return make
