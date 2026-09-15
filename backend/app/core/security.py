"""
AUTHENTICATION — who is calling, proven by a short-lived signed token.

This service is never called by a browser. The web app's server authenticates
the person (phone OTP for applicants, password + TOTP for staff), decides they
may do the thing, and then calls here with a token it signs per request:

    Authorization: Bearer <HS256 JWT, 60 seconds>

    iss  abizon-web            aud  abizon-backend
    sub  user / staff id       typ  applicant | staff | system
    role applicant | viewer | processor | admin | system
    kp   key prefix — applicants only: "<applicationId>/<travellerId>/"
    jti  unique per token      iat / exp

Why a token at all when the API is on a private network: "only reachable from
inside the VPC" is one misconfigured security group away from "reachable", and
the token is also what carries *who* and *which role* for RBAC and the logs.

Why `kp`: ownership of an application lives in the web app's tables, which this
service deliberately does not read. The web app checks ownership, then signs the
one key prefix the applicant may touch. A bug that lets an applicant name a
different traveller fails *here*, as well as there.
"""

from __future__ import annotations

import re
import time
import uuid
from dataclasses import dataclass
from typing import Literal, cast

import jwt

from app.core.config import Settings
from app.core.exceptions import Unauthorized

PrincipalType = Literal["applicant", "staff", "system"]

_STAFF_ROLES = {"viewer", "processor", "admin"}
_UUID = r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
_KEY_PREFIX = re.compile(rf"^{_UUID}/{_UUID}/$")

TOKEN_TTL_SECONDS = 60
CLOCK_LEEWAY_SECONDS = 10


@dataclass(frozen=True, slots=True)
class Principal:
    id: str
    type: PrincipalType
    role: str
    token_id: str
    key_prefix: str | None = None

    def may_touch_key(self, key_without_area: str) -> bool:
        """Applicants are confined to their prefix; staff and system are not
        (RBAC decides what they may do, not where)."""
        if self.type != "applicant":
            return True
        return self.key_prefix is not None and key_without_area.startswith(self.key_prefix)


def decode_service_token(token: str, settings: Settings) -> Principal:
    try:
        claims = jwt.decode(
            token,
            settings.jwt_secret(),
            algorithms=["HS256"],  # never read the algorithm from the token
            audience=settings.service_jwt_audience,
            issuer=settings.service_jwt_issuer,
            leeway=CLOCK_LEEWAY_SECONDS,
            options={"require": ["exp", "iat", "iss", "aud", "sub", "jti"]},
        )
    except jwt.PyJWTError as exc:
        # One message for every failure. Which check failed is for our logs,
        # not for whoever is holding a forged token.
        raise Unauthorized("Invalid or expired service token.") from exc

    # A 60-second token with an `exp` a day away was not minted by our web app.
    if claims["exp"] - claims["iat"] > TOKEN_TTL_SECONDS + CLOCK_LEEWAY_SECONDS:
        raise Unauthorized("Invalid or expired service token.")

    principal_type = claims.get("typ")
    role = claims.get("role")
    key_prefix = claims.get("kp")

    valid = (
        (principal_type == "applicant" and role == "applicant" and isinstance(key_prefix, str)
         and _KEY_PREFIX.match(key_prefix) is not None)
        or (principal_type == "staff" and role in _STAFF_ROLES and key_prefix is None)
        or (principal_type == "system" and role == "system" and key_prefix is None)
    )
    if not valid:
        raise Unauthorized("Invalid or expired service token.")

    return Principal(
        id=str(claims["sub"]),
        type=cast(PrincipalType, principal_type),
        role=str(role),
        token_id=str(claims["jti"]),
        key_prefix=key_prefix,
    )


def issue_service_token(
    settings: Settings,
    *,
    subject: str,
    principal_type: PrincipalType,
    role: str,
    key_prefix: str | None = None,
    ttl_seconds: int = TOKEN_TTL_SECONDS,
) -> str:
    """The Python twin of `src/lib/backend/token.ts`. Used by tests and by the
    worker when it calls back into itself; the web app signs its own."""
    now = int(time.time())
    claims: dict[str, object] = {
        "iss": settings.service_jwt_issuer,
        "aud": settings.service_jwt_audience,
        "sub": subject,
        "typ": principal_type,
        "role": role,
        "jti": uuid.uuid4().hex,
        "iat": now,
        "exp": now + ttl_seconds,
    }
    if key_prefix is not None:
        claims["kp"] = key_prefix
    return jwt.encode(claims, settings.jwt_secret(), algorithm="HS256")
