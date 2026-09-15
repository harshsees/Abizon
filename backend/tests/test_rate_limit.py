from fakeredis import FakeAsyncRedis
from redis.asyncio import Redis

from app.services.rate_limit import Limit, MemoryRateLimiter, RedisRateLimiter

LIMITS = {"test": Limit(3, 60)}


async def test_memory_limiter_blocks_after_the_limit() -> None:
    limiter = MemoryRateLimiter(LIMITS)
    decisions = [await limiter.hit("test", "caller") for _ in range(4)]
    assert [d.allowed for d in decisions] == [True, True, True, False]
    assert decisions[-1].retry_after_seconds >= 1
    assert (await limiter.hit("test", "another-caller")).allowed


async def test_redis_limiter_sliding_window() -> None:
    limiter = RedisRateLimiter(FakeAsyncRedis(), LIMITS)
    decisions = [await limiter.hit("test", "caller") for _ in range(5)]
    assert [d.allowed for d in decisions] == [True, True, True, False, False]
    assert decisions[0].remaining == 2
    # Rejected hits do not occupy the window, so the lockout does not grow.
    assert decisions[-1].retry_after_seconds <= 60


async def test_redis_limiter_fails_open_when_redis_is_down() -> None:
    unreachable = Redis.from_url("redis://127.0.0.1:1/0", socket_connect_timeout=0.2, socket_timeout=0.2)
    limiter = RedisRateLimiter(unreachable, LIMITS)
    assert (await limiter.hit("test", "caller")).allowed
    await unreachable.aclose()
