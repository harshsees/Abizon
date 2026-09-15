"""
GUARDS — authentication, authorisation and rate limiting as dependencies.

A route states what it needs in its signature and cannot run without it:

    @router.post("/documents/view-url")
    async def view(
        principal: Annotated[Principal, Depends(require_permission("storage.documents.read"))],
        ...

There is no way to write a handler that receives a `Principal` having skipped
the token check, because the only source of a `Principal` is `current_principal`.
Forgetting the permission is still possible — which is why every router in
`app/api/v1` is covered by a test asserting a lower role is refused.

Permission and limit names are checked when the route is *defined*, so a typo
fails at import, not as a silent 403 in production.
"""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.exceptions import Forbidden, RateLimited, Unauthorized, UpstreamUnavailable
from app.core.rbac import get_policy
from app.core.security import Principal, decode_service_token
from app.services.jobs import JobService
from app.services.rate_limit import LIMITS
from app.services.storage import StorageService

log = logging.getLogger("app.guard")

_bearer = HTTPBearer(auto_error=False)


async def current_principal(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> Principal:
    if credentials is None:
        raise Unauthorized()
    principal = decode_service_token(credentials.credentials, request.app.state.settings)
    request.state.principal = principal
    return principal


CurrentPrincipal = Annotated[Principal, Depends(current_principal)]


def authorize(principal: Principal, permission: str) -> None:
    """For checks that depend on the request body (e.g. which area is being
    deleted from). Routes with a fixed permission use `require_permission`."""
    if not get_policy().allows(principal.role, permission):
        log.warning(
            "permission denied",
            extra={"principal_type": principal.type, "role": principal.role, "permission": permission},
        )
        raise Forbidden()


def require_permission(permission: str) -> Callable[..., Awaitable[Principal]]:
    if permission not in get_policy().catalogue:
        raise KeyError(f"Unknown permission {permission!r}; add it to rbac.json first.")

    async def guard(principal: CurrentPrincipal) -> Principal:
        authorize(principal, permission)
        return principal

    return guard


def rate_limit(name: str) -> Callable[..., Awaitable[None]]:
    if name not in LIMITS:
        raise KeyError(f"Unknown rate limit {name!r}; add it to LIMITS first.")

    async def limiter(request: Request, principal: CurrentPrincipal) -> None:
        decision = await request.app.state.rate_limiter.hit(name, f"{principal.type}:{principal.id}")
        if not decision.allowed:
            raise RateLimited(decision.retry_after_seconds)

    return limiter


def storage_service(request: Request) -> StorageService:
    storage: StorageService | None = request.app.state.storage
    if storage is None:
        raise UpstreamUnavailable("Document storage is not configured.")
    return storage


def job_service(request: Request) -> JobService:
    database = request.app.state.database
    if database is None:
        raise UpstreamUnavailable("Background jobs are not configured.")
    return JobService(database)
