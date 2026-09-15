"""
STORAGE ROUTES — presigned URLs for the document pipeline.

The web app's flow, and which route serves each step:

    applicant picks a file      POST /v1/storage/incoming/upload-url   (browser PUTs to S3)
    web app normalises it       POST /v1/storage/incoming/download-url (size-checked first)
                                POST /v1/storage/documents/upload-url  (web app PUTs the JPEG)
                                POST /v1/storage/delete  area=incoming
    staff opens it              POST /v1/storage/documents/view-url    (60 seconds)
    retention job               POST /v1/storage/delete  area=documents

POST everywhere, including reads: a storage key in a query string ends up in
access logs and proxies, and the key contains application ids.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import CurrentPrincipal, authorize, rate_limit, require_permission, storage_service
from app.core.exceptions import Forbidden
from app.core.security import Principal
from app.schemas.storage import (
    DeleteOut,
    DeleteRequest,
    DownloadOut,
    KeyRequest,
    PresignedOut,
    UploadUrlRequest,
)
from app.services.storage import PresignedRequest, StorageService

router = APIRouter(prefix="/storage", tags=["storage"], dependencies=[Depends(rate_limit("storage.presign"))])

Storage = Annotated[StorageService, Depends(storage_service)]


def _confine(principal: Principal, key: str) -> None:
    if not principal.may_touch_key(key):
        raise Forbidden("That storage key is outside your application.")


def _out(request: PresignedRequest) -> PresignedOut:
    return PresignedOut(
        url=request.url, method=request.method, headers=request.headers, expires_in=request.expires_in
    )


@router.post("/incoming/upload-url")
async def incoming_upload_url(
    body: UploadUrlRequest,
    principal: Annotated[Principal, Depends(require_permission("storage.incoming.write"))],
    storage: Storage,
) -> PresignedOut:
    _confine(principal, body.key)
    return _out(storage.presign_upload("incoming", body.key, body.content_type))


@router.post("/incoming/download-url")
async def incoming_download_url(
    body: KeyRequest,
    principal: Annotated[Principal, Depends(require_permission("storage.incoming.read"))],
    storage: Storage,
) -> DownloadOut:
    _confine(principal, body.key)
    request, size = await storage.presign_download("incoming", body.key)
    return DownloadOut(**_out(request).model_dump(), byte_size=size)


@router.post("/documents/upload-url")
async def documents_upload_url(
    body: UploadUrlRequest,
    principal: Annotated[Principal, Depends(require_permission("storage.documents.write"))],
    storage: Storage,
) -> PresignedOut:
    _confine(principal, body.key)
    return _out(storage.presign_upload("documents", body.key, body.content_type))


@router.post("/documents/view-url")
async def documents_view_url(
    body: KeyRequest,
    principal: Annotated[Principal, Depends(require_permission("storage.documents.read"))],
    storage: Storage,
) -> PresignedOut:
    _confine(principal, body.key)
    return _out(storage.presign_view(body.key))


@router.post("/delete")
async def delete_objects(body: DeleteRequest, principal: CurrentPrincipal, storage: Storage) -> DeleteOut:
    authorize(principal, f"storage.{body.area}.delete")
    for key in body.keys:
        _confine(principal, key)
    return DeleteOut(deleted=await storage.delete(body.area, body.keys))
