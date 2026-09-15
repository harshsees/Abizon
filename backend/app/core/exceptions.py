"""
EXCEPTIONS — one error shape, and nothing internal leaves the service.

Every failure a caller sees has the same body:

    {"error": {"code": "not_found", "message": "…", "request_id": "…"}}

`code` is stable and machine-readable (the web client branches on it);
`message` is safe to show; `request_id` joins the response to the log line.

What never appears: stack traces, SQL, bucket names, or the *input* that failed
validation. Pydantic's default 422 echoes the submitted value back, and on this
service a submitted value can be a passport-derived storage key or a prompt
containing an applicant's details.

Unhandled exceptions are turned into a 500 by `RequestContextMiddleware`, not
here, so that the response still carries the request id header.
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import current_request_id


class AppError(Exception):
    """Base for every error written to be shown to a caller."""

    status_code: int = 500
    code: str = "internal_error"
    message: str = "Something went wrong."

    def __init__(
        self,
        message: str | None = None,
        *,
        details: list[dict[str, Any]] | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        self.message = message or type(self).message
        self.details = details
        self.headers = headers
        super().__init__(self.message)


class BadRequest(AppError):
    status_code, code, message = 400, "bad_request", "The request could not be understood."


class Unauthorized(AppError):
    status_code, code, message = 401, "unauthorized", "Authentication is required."


class Forbidden(AppError):
    status_code, code, message = 403, "forbidden", "You are not allowed to do that."


class NotFound(AppError):
    status_code, code, message = 404, "not_found", "Not found."


class Conflict(AppError):
    status_code, code, message = 409, "conflict", "That conflicts with the current state."


class PayloadTooLarge(AppError):
    status_code, code, message = 413, "payload_too_large", "The request body is too large."


class RateLimited(AppError):
    status_code, code, message = 429, "rate_limited", "Too many requests. Try again shortly."

    def __init__(self, retry_after_seconds: int, message: str | None = None) -> None:
        self.retry_after_seconds = max(1, retry_after_seconds)
        super().__init__(message, headers={"Retry-After": str(self.retry_after_seconds)})


class UpstreamUnavailable(AppError):
    """AWS, Redis or the database did not answer. Retryable by definition."""

    status_code, code, message = 503, "upstream_unavailable", "A dependency is unavailable. Try again."


def error_response(
    status_code: int,
    code: str,
    message: str,
    *,
    details: list[dict[str, Any]] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    body: dict[str, Any] = {"code": code, "message": message, "request_id": current_request_id()}
    if details:
        body["details"] = details
    return JSONResponse({"error": body}, status_code=status_code, headers=headers)


_HTTP_CODES = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    405: "method_not_allowed",
    413: "payload_too_large",
    415: "unsupported_media_type",
}


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> JSONResponse:
        return error_response(
            exc.status_code, exc.code, exc.message, details=exc.details, headers=exc.headers
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        details = [
            {
                # `("body", "prompt")` → "prompt". The location kind is noise to
                # a caller who sent JSON.
                "field": ".".join(str(part) for part in error["loc"][1:]) or str(error["loc"][0]),
                "problem": error["msg"],
                # Deliberately no `input`: see the module docstring.
            }
            for error in exc.errors()
        ]
        return error_response(422, "validation_failed", "The request is invalid.", details=details)

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = _HTTP_CODES.get(exc.status_code, "http_error")
        message = exc.detail if isinstance(exc.detail, str) else "Request failed."
        return error_response(exc.status_code, code, message, headers=exc.headers)
