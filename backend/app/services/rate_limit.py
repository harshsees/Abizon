"""
RATE LIMITING — sliding window, per caller, in Redis.

Every limit is named and listed in `LIMITS`, so "what are we allowing" has one
answer. Identity is the authenticated principal (`staff:<id>`), not the IP:
every request arrives from the web app's container, so an IP limit here would
be one shared bucket for the whole site.

Sliding window over a sorted set, in one MULTI/EXEC: drop entries older than the
window, add this request, count. A fixed window lets a caller spend two windows'
allowance in the two seconds around the boundary. A rejected request removes its
own entry, so hammering while limited does not extend the lockout.

FAILS OPEN if Redis is unreachable — the same asymmetry as `src/lib/rateLimit.ts`.
A Redis outage should not take document uploads down with it, and the costly
path (Bedrock) has its own account-level quotas behind this one.
"""

from __future__ import annotations

import asyncio
import logging
import math
import time
import uuid
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Protocol

from redis.asyncio import Redis
from redis.exceptions import RedisError

log = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class Limit:
    limit: int
    window_seconds: int


LIMITS: dict[str, Limit] = {
    # An application needs a handful of URLs per document (upload, read back,
    # store, view). A thousand an hour is someone using the bucket as storage.
    "storage.presign": Limit(240, 3600),
    # Each job is a paid model call.
    "ai.jobs": Limit(60, 3600),
    # Polling a job every couple of seconds while it runs.
    "jobs.read": Limit(1800, 3600),
}


@dataclass(frozen=True, slots=True)
class Decision:
    allowed: bool
    remaining: int
    retry_after_seconds: int = 0


class RateLimiter(Protocol):
    async def hit(self, name: str, identity: str) -> Decision: ...

    async def close(self) -> None: ...


class RedisRateLimiter:
    def __init__(self, redis: Redis, limits: dict[str, Limit] | None = None) -> None:
        self._redis = redis
        self._limits = limits or LIMITS

    async def hit(self, name: str, identity: str) -> Decision:
        rule = self._limits[name]
        key = f"abizon:rl:{name}:{identity}"
        now_ms = int(time.time() * 1000)
        window_ms = rule.window_seconds * 1000
        member = f"{now_ms}:{uuid.uuid4().hex}"

        try:
            async with self._redis.pipeline(transaction=True) as pipe:
                pipe.zremrangebyscore(key, 0, now_ms - window_ms)
                pipe.zadd(key, {member: now_ms})
                pipe.zcard(key)
                pipe.zrange(key, 0, 0, withscores=True)
                pipe.pexpire(key, window_ms)
                _, _, count, oldest, _ = await pipe.execute()

            if count <= rule.limit:
                return Decision(True, rule.limit - count)

            await self._redis.zrem(key, member)
            oldest_ms = int(oldest[0][1]) if oldest else now_ms
            retry_after = math.ceil((oldest_ms + window_ms - now_ms) / 1000)
            return Decision(False, 0, max(1, retry_after))
        except RedisError:
            log.exception("rate limiter unavailable, allowing request", extra={"limit": name})
            return Decision(True, 0)

    async def close(self) -> None:
        await self._redis.aclose()


class MemoryRateLimiter:
    """
    Development and tests. Counts in this process only, so behind N workers the
    real allowance is N times the limit — which is why production refuses to
    start without REDIS_URL.
    """

    def __init__(self, limits: dict[str, Limit] | None = None) -> None:
        self._limits = limits or LIMITS
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def hit(self, name: str, identity: str) -> Decision:
        rule = self._limits[name]
        key = f"{name}:{identity}"
        now = time.monotonic()

        async with self._lock:
            hits = self._hits[key]
            while hits and hits[0] <= now - rule.window_seconds:
                hits.popleft()
            if len(hits) >= rule.limit:
                retry_after = math.ceil(hits[0] + rule.window_seconds - now)
                return Decision(False, 0, max(1, retry_after))
            hits.append(now)
            return Decision(True, rule.limit - len(hits))

    async def close(self) -> None:
        self._hits.clear()
