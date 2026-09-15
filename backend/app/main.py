"""
THE APPLICATION FACTORY.

    uvicorn app.main:app

Everything with a lifetime — the connection pool, the Redis client, the S3
client — is created in `lifespan`, an async context manager, and closed when it
exits. Nothing opens a connection at import time, so importing the app (tests,
Alembic, the Celery worker) never needs a network.

Anything already placed on `app.state` before startup is left alone. That is the
test seam: tests put a SQLite database, a moto-backed S3 and an in-memory rate
limiter there, and the same code path runs against them.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI
from redis.asyncio import Redis
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api import health
from app.api.v1 import router as v1_router
from app.core.config import Settings, get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging
from app.core.rbac import get_policy
from app.db.session import Database
from app.middleware.request_context import RequestContextMiddleware
from app.middleware.security import BodySizeLimitMiddleware, SecurityHeadersMiddleware
from app.services.rate_limit import MemoryRateLimiter, RedisRateLimiter
from app.services.storage import StorageService

log = logging.getLogger("app")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level)
    # Fail at startup, not on the first request, if rbac.json is invalid.
    get_policy()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        state = app.state
        closers: list[Callable[[], Awaitable[None]]] = []

        if not hasattr(state, "database"):
            state.database = (
                Database(settings.database_url, pool_size=settings.database_pool_size)
                if settings.database_url
                else None
            )
            if state.database:
                closers.append(state.database.dispose)

        if not hasattr(state, "redis"):
            state.redis = (
                Redis.from_url(settings.redis_url, socket_timeout=1, socket_connect_timeout=1)
                if settings.redis_url
                else None
            )
            if state.redis:
                closers.append(state.redis.aclose)

        if not hasattr(state, "rate_limiter"):
            if state.redis is None:
                log.warning("REDIS_URL is not set: rate limits are counted in process memory")
            state.rate_limiter = RedisRateLimiter(state.redis) if state.redis else MemoryRateLimiter()

        if not hasattr(state, "storage"):
            state.storage = StorageService(settings) if settings.s3_bucket else None

        if not hasattr(state, "enqueue"):
            # Imported here so that importing the API does not configure Celery.
            from app.worker.dispatch import enqueue_job

            state.enqueue = enqueue_job

        log.info(
            "started",
            extra={
                "environment": settings.environment,
                "database": state.database is not None,
                "redis": state.redis is not None,
                "storage": state.storage is not None,
            },
        )
        try:
            yield
        finally:
            for close in reversed(closers):
                await close()

    app = FastAPI(
        title="Abizon backend",
        version="0.1.0",
        lifespan=lifespan,
        # The schema is a map of every route. Useful locally, pointless to publish.
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None,
        openapi_url=None if settings.is_production else "/openapi.json",
    )
    app.state.settings = settings

    register_exception_handlers(app)

    # Added innermost-first; each `add_middleware` wraps everything added before.
    # Resulting order, outermost to innermost:
    #   SecurityHeaders → RequestContext → BodySizeLimit → TrustedHost → routes
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)
    app.add_middleware(BodySizeLimitMiddleware, max_bytes=512 * 1024)
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)

    app.include_router(health.router)
    app.include_router(v1_router)
    return app


def __getattr__(name: str) -> FastAPI:
    # `uvicorn app.main:app` — built on first access, so `import app.main` in
    # tests does not read the environment.
    if name == "app":
        instance = create_app()
        globals()["app"] = instance
        return instance
    raise AttributeError(name)
