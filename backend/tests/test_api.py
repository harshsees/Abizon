"""Middleware, error envelope and health — the behaviour every route inherits."""

import uuid


async def test_missing_token_uses_the_error_envelope(client) -> None:
    response = await client.get(f"/v1/jobs/{uuid.uuid4()}")
    assert response.status_code == 401
    error = response.json()["error"]
    assert error["code"] == "unauthorized"
    assert error["request_id"] == response.headers["x-request-id"]


async def test_callers_request_id_is_kept(client) -> None:
    response = await client.get("/health/live", headers={"X-Request-ID": "web-0123456789"})
    assert response.headers["x-request-id"] == "web-0123456789"


async def test_malformed_request_id_is_replaced(client) -> None:
    response = await client.get("/health/live", headers={"X-Request-ID": "has spaces\tand tabs"})
    assert response.headers["x-request-id"] != "has spaces\tand tabs"


async def test_validation_errors_name_the_field_but_never_echo_the_value(client, auth) -> None:
    response = await client.post(
        "/v1/storage/incoming/upload-url",
        json={"key": "x", "content_type": "image/jpeg", "note": "PASSPORT-Z9876543"},
        headers=auth(),
    )
    assert response.status_code == 422
    body = response.json()["error"]
    assert body["code"] == "validation_failed"
    fields = {detail["field"] for detail in body["details"]}
    assert {"key", "note"} <= fields
    assert "PASSPORT-Z9876543" not in response.text


async def test_unhandled_exception_is_a_generic_500_with_request_id(app, client) -> None:
    @app.get("/boom")
    async def boom() -> None:
        raise RuntimeError('relation "svc.jobs" does not exist')

    response = await client.get("/boom")
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "internal_error"
    assert "svc.jobs" not in response.text
    assert response.headers["x-request-id"]
    # The security headers wrap even the last-resort response.
    assert response.headers["x-content-type-options"] == "nosniff"


async def test_security_headers(client) -> None:
    response = await client.get("/health/live")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-frame-options"] == "DENY"


async def test_oversized_body_is_refused_before_parsing(client, auth) -> None:
    response = await client.post(
        "/v1/jobs/ai-completions",
        content=b"{" + b" " * (600 * 1024) + b"}",
        headers={**auth("processor"), "content-type": "application/json"},
    )
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "payload_too_large"


async def test_unknown_route_uses_the_envelope(client) -> None:
    response = await client.get("/v1/nothing-here")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


async def test_readiness_reports_each_dependency(client) -> None:
    response = await client.get("/health/ready")
    assert response.status_code == 200
    assert response.json()["checks"] == {"database": True, "redis": None, "storage": True}
