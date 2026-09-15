import uuid
from urllib.parse import urlparse

import pytest
from botocore.exceptions import ClientError

from app.services.rate_limit import LIMITS, Limit, MemoryRateLimiter
from tests.conftest import BUCKET, PREFIX, REGION


def _key(kind: str = "passport") -> str:
    return f"{PREFIX}{kind}-{uuid.uuid4()}"


async def test_upload_url_is_regional_and_virtual_hosted(client, auth) -> None:
    key = _key()
    response = await client.post(
        "/v1/storage/incoming/upload-url", json={"key": key, "content_type": "image/jpeg"}, headers=auth()
    )
    assert response.status_code == 200, response.text
    body = response.json()
    url = urlparse(body["url"])
    # The web app's CSP names exactly this origin; a global-endpoint URL would be blocked.
    assert f"{url.scheme}://{url.netloc}" == f"https://{BUCKET}.s3.{REGION}.amazonaws.com"
    assert url.path == f"/incoming/{key}"
    assert body["method"] == "PUT"
    assert body["headers"] == {"Content-Type": "image/jpeg"}


async def test_applicant_cannot_reach_another_travellers_prefix(client, auth) -> None:
    foreign = f"{uuid.uuid4()}/{uuid.uuid4()}/passport-1"
    response = await client.post(
        "/v1/storage/incoming/upload-url", json={"key": foreign, "content_type": "image/jpeg"}, headers=auth()
    )
    assert response.status_code == 403


async def test_path_traversal_is_refused(client, auth) -> None:
    response = await client.post(
        "/v1/storage/incoming/upload-url",
        json={"key": f"{PREFIX}../../etc/passwd", "content_type": "image/jpeg"},
        headers=auth(),
    )
    assert response.status_code == 400


async def test_only_images_may_be_uploaded(client, auth) -> None:
    response = await client.post(
        "/v1/storage/incoming/upload-url", json={"key": _key(), "content_type": "text/html"}, headers=auth()
    )
    assert response.status_code == 400


async def test_stored_documents_must_be_jpeg(client, auth) -> None:
    response = await client.post(
        "/v1/storage/documents/upload-url", json={"key": _key(), "content_type": "image/png"}, headers=auth()
    )
    assert response.status_code == 400


async def test_applicant_cannot_mint_view_urls(client, auth) -> None:
    response = await client.post("/v1/storage/documents/view-url", json={"key": _key()}, headers=auth())
    assert response.status_code == 403


async def test_viewer_gets_an_inline_short_lived_view_url(client, auth) -> None:
    response = await client.post("/v1/storage/documents/view-url", json={"key": _key()}, headers=auth("viewer"))
    assert response.status_code == 200
    body = response.json()
    assert body["expires_in"] == 60
    assert "response-content-disposition=inline" in body["url"]


async def test_download_url_reports_size(client, auth, s3) -> None:
    key = _key()
    s3.put_object(Bucket=BUCKET, Key=f"incoming/{key}", Body=b"\xff\xd8" + b"0" * 100)
    response = await client.post("/v1/storage/incoming/download-url", json={"key": key}, headers=auth())
    assert response.status_code == 200
    assert response.json()["byte_size"] == 102


async def test_oversized_upload_is_refused_and_deleted(client, auth, s3, settings) -> None:
    settings.max_upload_bytes = 64
    key = _key()
    s3.put_object(Bucket=BUCKET, Key=f"incoming/{key}", Body=b"0" * 65)

    response = await client.post("/v1/storage/incoming/download-url", json={"key": key}, headers=auth())
    assert response.status_code == 413

    with pytest.raises(ClientError):
        s3.head_object(Bucket=BUCKET, Key=f"incoming/{key}")


async def test_missing_object_is_404(client, auth) -> None:
    response = await client.post("/v1/storage/incoming/download-url", json={"key": _key()}, headers=auth())
    assert response.status_code == 404


async def test_deleting_documents_needs_the_area_permission(client, auth, s3) -> None:
    key = _key()
    s3.put_object(Bucket=BUCKET, Key=f"documents/{key}.jpg", Body=b"x")

    denied = await client.post(
        "/v1/storage/delete", json={"area": "documents", "keys": [f"{key}.jpg"]}, headers=auth("processor")
    )
    assert denied.status_code == 403

    allowed = await client.post(
        "/v1/storage/delete", json={"area": "documents", "keys": [f"{key}.jpg"]}, headers=auth("admin")
    )
    assert allowed.status_code == 200
    assert allowed.json() == {"deleted": 1}


async def test_presigning_is_rate_limited_per_caller(app, client, auth) -> None:
    app.state.rate_limiter = MemoryRateLimiter({**LIMITS, "storage.presign": Limit(2, 60)})
    headers = auth(subject="the-same-applicant")
    body = {"key": _key(), "content_type": "image/jpeg"}

    for _ in range(2):
        assert (await client.post("/v1/storage/incoming/upload-url", json=body, headers=headers)).status_code == 200

    limited = await client.post("/v1/storage/incoming/upload-url", json=body, headers=headers)
    assert limited.status_code == 429
    assert int(limited.headers["retry-after"]) >= 1

    # A different caller has their own budget.
    other = await client.post("/v1/storage/incoming/upload-url", json=body, headers=auth(subject="someone-else"))
    assert other.status_code == 200
