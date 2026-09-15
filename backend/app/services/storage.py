"""
DOCUMENT STORAGE ON S3 — the replacement for Supabase Storage.

One private bucket, two prefixes, and the split is the design the web app
already relies on (`src/lib/storage/documents.ts`):

  incoming/   raw camera output. The browser PUTs here on a presigned URL. Read
              once by the web app's normaliser, then deleted. Anything left
              after `INCOMING_MAX_AGE_SECONDS` is removed hourly by Celery beat,
              and an S3 lifecycle rule removes it after a day regardless.
  documents/  re-encoded JPEGs with EXIF stripped. What staff view, on a
              60-second presigned GET.

This service never holds document bytes. It signs URLs, checks sizes, deletes.
The bucket blocks all public access and encrypts at rest by default
(`infra/aws/`); a presigned URL is the only way in, and it expires.

KEYS are composed by the web app from ids it has verified. They are still
validated here — this is the process holding the IAM role, so it is the last
place a `../` or an absolute path can be stopped.
"""

from __future__ import annotations

import asyncio
import logging
import re
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Literal

from app.core.config import Settings
from app.core.exceptions import BadRequest, PayloadTooLarge, UpstreamUnavailable
from app.core.logging import timed
from app.services.aws import aws_errors, s3_client

log = logging.getLogger(__name__)

Area = Literal["incoming", "documents"]

ACCEPTED_TYPES: dict[Area, frozenset[str]] = {
    "incoming": frozenset({"image/jpeg", "image/png", "image/webp"}),
    # Only the normaliser writes here, and it always emits JPEG.
    "documents": frozenset({"image/jpeg"}),
}

_SEGMENT = r"[A-Za-z0-9][A-Za-z0-9_.-]{0,99}"
_VALID_KEY = re.compile(rf"^{_SEGMENT}(/{_SEGMENT}){{0,4}}$")


def validate_key(key: str) -> str:
    if len(key) > 512 or not _VALID_KEY.match(key) or ".." in key:
        raise BadRequest("That storage key is not valid.")
    return key


@dataclass(frozen=True, slots=True)
class PresignedRequest:
    url: str
    method: Literal["GET", "PUT"]
    headers: dict[str, str]
    expires_in: int


class StorageService:
    def __init__(self, settings: Settings) -> None:
        if not settings.s3_bucket:
            raise UpstreamUnavailable("Document storage is not configured.")
        self._bucket = settings.s3_bucket
        self._settings = settings
        self._client = s3_client(settings.aws_region, settings.s3_endpoint_url)

    @staticmethod
    def object_key(area: Area, key: str) -> str:
        return f"{area}/{validate_key(key)}"

    # --- Signing (no network: presigning is a local HMAC) --------------------

    def presign_upload(self, area: Area, key: str, content_type: str) -> PresignedRequest:
        if content_type not in ACCEPTED_TYPES[area]:
            raise BadRequest("Upload a JPEG, PNG or WebP image." if area == "incoming" else
                             "Stored documents must be JPEG.")
        ttl = self._settings.upload_url_ttl_seconds
        with aws_errors("presign_put"):
            url = self._client.generate_presigned_url(
                "put_object",
                # ContentType is signed: the PUT must send the same header, so a
                # URL minted for an image cannot be used to store `text/html`.
                Params={"Bucket": self._bucket, "Key": self.object_key(area, key), "ContentType": content_type},
                ExpiresIn=ttl,
            )
        return PresignedRequest(url, "PUT", {"Content-Type": content_type}, ttl)

    def presign_view(self, key: str) -> PresignedRequest:
        ttl = self._settings.view_url_ttl_seconds
        with aws_errors("presign_get"):
            url = self._client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": self._bucket,
                    "Key": self.object_key("documents", key),
                    # Render, never download — see the note on malware scanning
                    # in `src/lib/storage/normalise.ts`.
                    "ResponseContentDisposition": "inline",
                    "ResponseContentType": "image/jpeg",
                },
                ExpiresIn=ttl,
            )
        return PresignedRequest(url, "GET", {}, ttl)

    # --- Calls that touch S3 ---------------------------------------------------

    async def presign_download(self, area: Area, key: str) -> tuple[PresignedRequest, int]:
        """
        A GET URL for the web app's server to read an object back — with the
        size checked first. A presigned PUT cannot enforce a size limit, so the
        first moment an oversized upload can be refused is before anyone reads
        it. It is deleted on the spot rather than left for the purge.
        """
        object_key = self.object_key(area, key)

        with timed(log, "s3.head", area=area), aws_errors("head_object"):
            head = await asyncio.to_thread(self._client.head_object, Bucket=self._bucket, Key=object_key)

        size = int(head["ContentLength"])
        if size > self._settings.max_upload_bytes:
            await self.delete(area, [key])
            raise PayloadTooLarge(
                f"That file is {size // (1024 * 1024)}MB. "
                f"The limit is {self._settings.max_upload_bytes // (1024 * 1024)}MB."
            )

        ttl = 60
        with aws_errors("presign_get"):
            url = self._client.generate_presigned_url(
                "get_object", Params={"Bucket": self._bucket, "Key": object_key}, ExpiresIn=ttl
            )
        return PresignedRequest(url, "GET", {}, ttl), size

    async def delete(self, area: Area, keys: list[str]) -> int:
        object_keys = [self.object_key(area, key) for key in keys]
        deleted = 0
        # DeleteObjects takes at most 1,000 keys per call.
        for start in range(0, len(object_keys), 1000):
            batch = object_keys[start : start + 1000]
            with timed(log, "s3.delete", area=area, count=len(batch)), aws_errors("delete_objects"):
                response = await asyncio.to_thread(
                    self._client.delete_objects,
                    Bucket=self._bucket,
                    Delete={"Objects": [{"Key": key} for key in batch], "Quiet": True},
                )
            errors = response.get("Errors", [])
            if errors:
                log.error("some objects were not deleted", extra={"area": area, "failed": len(errors)})
            deleted += len(batch) - len(errors)
        return deleted

    async def purge_older_than(self, area: Area, age: timedelta) -> int:
        cutoff = datetime.now(UTC) - age

        def stale_keys() -> list[str]:
            paginator = self._client.get_paginator("list_objects_v2")
            found: list[str] = []
            for page in paginator.paginate(Bucket=self._bucket, Prefix=f"{area}/"):
                for item in page.get("Contents", []):
                    if item["LastModified"] < cutoff:
                        found.append(item["Key"].removeprefix(f"{area}/"))
            return found

        with aws_errors("list_objects_v2"):
            keys = await asyncio.to_thread(stale_keys)
        return await self.delete(area, keys) if keys else 0

    async def ping(self) -> None:
        with aws_errors("head_bucket"):
            await asyncio.to_thread(self._client.head_bucket, Bucket=self._bucket)
