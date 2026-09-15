"""
HEALTH — liveness and readiness, unauthenticated, booleans only.

  /health/live    the process is up. Docker's healthcheck; restarts on failure.
  /health/ready   dependencies answer. All probes run concurrently with a
                  two-second budget each, so a hung S3 call cannot make the
                  whole check hang — the probe reports `false` and moves on.

503 only when the database is down: it is the one dependency without a
degraded mode. Redis down means rate limits fail open; S3 down means uploads
fail with a clear error, not that the service should be pulled from rotation.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

log = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["health"])

PROBE_TIMEOUT_SECONDS = 2.0


@router.get("/live")
async def live() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready")
async def ready(request: Request) -> JSONResponse:
    state = request.app.state

    async def probe(name: str, check: Callable[[], Awaitable[object]] | None) -> tuple[str, bool | None]:
        if check is None:
            return name, None  # not configured
        try:
            async with asyncio.timeout(PROBE_TIMEOUT_SECONDS):
                await check()
            return name, True
        except Exception as exc:
            log.warning("readiness probe failed", extra={"probe": name, "error": type(exc).__name__})
            return name, False

    results = dict(
        await asyncio.gather(
            probe("database", state.database.ping if state.database else None),
            probe("redis", state.redis.ping if state.redis else None),
            probe("storage", state.storage.ping if state.storage else None),
        )
    )

    healthy = results["database"] is not False
    return JSONResponse(
        {"status": "ok" if healthy else "degraded", "checks": results},
        status_code=200 if healthy else 503,
    )
