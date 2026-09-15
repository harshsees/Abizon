"""
REQUEST CONTEXT — request id, access log, and the last-resort 500.

Pure ASGI rather than `BaseHTTPMiddleware`: the latter runs the endpoint in a
separate task, which breaks `ContextVar` propagation (the request id would be
missing from logs written inside the route) and buffers streaming responses.

This is also where an *unhandled* exception becomes a response. Starlette's
own `ServerErrorMiddleware` sits outside every user middleware, so a 500 it
produced would never pass back through here and would lose the
`X-Request-ID` header — the one thing somebody reporting the error can quote.
"""

from __future__ import annotations

import logging
import re
import time
import uuid

from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.exceptions import error_response
from app.core.logging import request_id_scope

log = logging.getLogger("app.access")

# Accept the web app's id so one id spans both services' logs, but only if it
# looks like an id — this value is written into every log line.
_VALID_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{8,128}$")


def _header(scope: Scope, name: bytes) -> str | None:
    for key, value in scope.get("headers", []):
        if key == name:
            return value.decode("latin-1")
    return None


class RequestContextMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        supplied = _header(scope, b"x-request-id")
        request_id = supplied if supplied and _VALID_REQUEST_ID.match(supplied) else uuid.uuid4().hex

        status = 500
        response_started = False
        began = time.perf_counter()

        async def send_with_id(message: Message) -> None:
            nonlocal status, response_started
            if message["type"] == "http.response.start":
                response_started = True
                status = message["status"]
                headers = list(message.get("headers", []))
                headers.append((b"x-request-id", request_id.encode("latin-1")))
                message = {**message, "headers": headers}
            await send(message)

        with request_id_scope(request_id):
            try:
                await self.app(scope, receive, send_with_id)
            except Exception:
                log.exception("unhandled error")
                if response_started:
                    # Headers are gone; the only honest thing left is to drop
                    # the connection, which re-raising does.
                    raise
                response = error_response(500, "internal_error", "Something went wrong.")
                await response(scope, receive, send_with_id)
            finally:
                # Path, not URL: query strings are not logged.
                log.info(
                    "request",
                    extra={
                        "method": scope.get("method"),
                        "path": scope.get("path"),
                        "status": status,
                        "duration_ms": round((time.perf_counter() - began) * 1000, 1),
                    },
                )
