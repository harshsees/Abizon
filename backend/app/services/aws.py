"""
AWS CLIENTS (boto3) and the one place AWS errors are translated.

Credentials are never configured here. boto3's default chain finds them: the
EC2 instance profile in production, `~/.aws` or environment variables on a
developer machine, MinIO's keys under docker-compose. An access key in `.env`
on a server is a key that ends up in a backup, a screenshot, or a support
ticket; an instance role cannot be copied off the box.

boto3 is synchronous. Called from async code it goes through
`asyncio.to_thread`, so a slow S3 call occupies one thread instead of stalling
the event loop — and with it every other request on this worker.
"""

from __future__ import annotations

import logging
from collections.abc import Iterator
from contextlib import contextmanager
from functools import lru_cache
from typing import TYPE_CHECKING

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from app.core.exceptions import AppError, NotFound, UpstreamUnavailable

if TYPE_CHECKING:
    from mypy_boto3_s3 import S3Client  # pragma: no cover
else:
    S3Client = object

log = logging.getLogger(__name__)


@lru_cache(maxsize=8)
def s3_client(region: str, endpoint_url: str | None = None) -> S3Client:
    """
    Cached per (region, endpoint): clients are thread-safe and expensive to
    build (they load service models from disk).

    The endpoint is pinned to the *regional* host. Left to itself boto3 may sign
    URLs for the global `s3.amazonaws.com`, which redirects cross-region and
    breaks a browser PUT — and the web app's Content-Security-Policy names
    exactly `https://<bucket>.s3.<region>.amazonaws.com`.
    """
    return boto3.client(
        "s3",
        region_name=region,
        endpoint_url=endpoint_url or f"https://s3.{region}.amazonaws.com",
        config=Config(
            signature_version="s3v4",
            # Virtual-hosted on AWS (path-style is deprecated there); path-style
            # for MinIO, which has no per-bucket DNS.
            s3={"addressing_style": "path" if endpoint_url else "virtual"},
            retries={"max_attempts": 3, "mode": "standard"},
            connect_timeout=3,
            read_timeout=10,
        ),
    )


@contextmanager
def aws_errors(operation: str) -> Iterator[None]:
    """
    Turns botocore failures into the service's own errors, so no route ever
    returns an AWS error message (which names buckets, keys and account ids).
    """
    try:
        yield
    except AppError:
        raise
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code in {"NoSuchKey", "404", "NotFound"}:
            raise NotFound("That object does not exist.") from exc
        # AccessDenied here means the instance role is wrong, not the caller.
        log.error("aws call failed", extra={"operation": operation, "aws_code": code})
        raise UpstreamUnavailable("Document storage is unavailable.") from exc
    except BotoCoreError as exc:
        log.error("aws unreachable", extra={"operation": operation, "error": type(exc).__name__})
        raise UpstreamUnavailable("Document storage is unavailable.") from exc
