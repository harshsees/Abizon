"""
LOGGING — one JSON object per line, tagged with the request that caused it.

JSON because CloudWatch Logs Insights can query fields (`filter status >= 500`)
and cannot query prose. The request id lives in a `ContextVar`, which asyncio
copies into every task spawned while handling the request, so a log line
written deep inside a service still names the request without the id being
passed down by hand.

Nothing here logs request bodies, query strings or headers. Those carry storage
keys, prompts and bearer tokens.
"""

from __future__ import annotations

import json
import logging
import sys
import time
from collections.abc import Iterator
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import UTC, datetime

_request_id: ContextVar[str | None] = ContextVar("request_id", default=None)


def current_request_id() -> str | None:
    return _request_id.get()


@contextmanager
def request_id_scope(request_id: str | None) -> Iterator[None]:
    """Binds a request id for the duration of a block — an HTTP request, or a
    Celery task that was enqueued by one. Always restores the previous value,
    even on error, which is the whole reason this is a context manager."""
    token = _request_id.set(request_id)
    try:
        yield
    finally:
        _request_id.reset(token)


class JsonFormatter(logging.Formatter):
    # Attributes every LogRecord has; anything else was passed via `extra=`.
    _RESERVED = set(vars(logging.LogRecord("", 0, "", 0, "", None, None))) | {"message", "asctime"}

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "ts": datetime.fromtimestamp(record.created, UTC).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if request_id := current_request_id():
            payload["request_id"] = request_id
        for key, value in vars(record).items():
            if key not in self._RESERVED and not key.startswith("_"):
                payload[key] = value
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def configure_logging(level: str = "INFO") -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())

    root = logging.getLogger()
    root.handlers[:] = [handler]
    root.setLevel(level.upper())

    # Uvicorn's own access log duplicates ours without the request id.
    logging.getLogger("uvicorn.access").disabled = True
    # botocore at DEBUG logs signed URLs and request headers.
    logging.getLogger("botocore").setLevel(max(logging.INFO, root.level))


@contextmanager
def timed(logger: logging.Logger, operation: str, **fields: object) -> Iterator[dict[str, object]]:
    """
    Logs how long a block took and whether it raised.

        with timed(log, "s3.presign", key_kind="incoming") as span:
            url = ...
            span["bytes"] = size   # extra fields added inside the block

    The exception is re-raised untouched; this only observes.
    """
    span: dict[str, object] = dict(fields)
    started = time.perf_counter()
    outcome = "ok"
    try:
        yield span
    except BaseException:
        outcome = "error"
        raise
    finally:
        span["duration_ms"] = round((time.perf_counter() - started) * 1000, 1)
        span["outcome"] = outcome
        logger.info(operation, extra=span)
