import time
import uuid

import jwt
import pytest

from app.core.exceptions import Unauthorized
from app.core.security import Principal, decode_service_token, issue_service_token
from tests.conftest import PREFIX


def _claims(settings, **overrides):
    now = int(time.time())
    claims = {
        "iss": settings.service_jwt_issuer,
        "aud": settings.service_jwt_audience,
        "sub": str(uuid.uuid4()),
        "typ": "staff",
        "role": "viewer",
        "jti": uuid.uuid4().hex,
        "iat": now,
        "exp": now + 60,
    }
    claims.update(overrides)
    return {k: v for k, v in claims.items() if v is not None}


def _sign(settings, claims, secret=None):
    return jwt.encode(claims, secret or settings.jwt_secret(), algorithm="HS256")


def test_round_trip_applicant(settings) -> None:
    token = issue_service_token(
        settings, subject="user-1", principal_type="applicant", role="applicant", key_prefix=PREFIX
    )
    principal = decode_service_token(token, settings)
    assert principal.type == "applicant"
    assert principal.key_prefix == PREFIX


@pytest.mark.parametrize(
    "overrides",
    [
        {"aud": "someone-else"},
        {"iss": "not-the-web-app"},
        {"exp": int(time.time()) - 3600, "iat": int(time.time()) - 3660},
        {"jti": None},
        # A 60-second token is what the web app mints. A day-long one was not.
        {"exp": int(time.time()) + 86_400},
        {"role": "superuser"},
        {"typ": "applicant", "role": "applicant"},  # applicant with no key prefix
        {"typ": "applicant", "role": "applicant", "kp": "../../"},
        {"typ": "staff", "role": "admin", "kp": PREFIX},  # staff are not confined
        {"typ": "system", "role": "admin"},
    ],
)
def test_rejected_tokens(settings, overrides) -> None:
    with pytest.raises(Unauthorized):
        decode_service_token(_sign(settings, _claims(settings, **overrides)), settings)


def test_wrong_secret_is_rejected(settings) -> None:
    token = _sign(settings, _claims(settings), secret="a-different-secret-of-sufficient-length!")
    with pytest.raises(Unauthorized):
        decode_service_token(token, settings)


def test_unsigned_token_is_rejected(settings) -> None:
    token = jwt.encode(_claims(settings, role="admin"), key="", algorithm="none")
    with pytest.raises(Unauthorized):
        decode_service_token(token, settings)


def test_applicants_are_confined_to_their_prefix() -> None:
    applicant = Principal(id="u", type="applicant", role="applicant", token_id="t", key_prefix=PREFIX)
    assert applicant.may_touch_key(f"{PREFIX}passport-1.jpg")
    assert not applicant.may_touch_key(f"{uuid.uuid4()}/{uuid.uuid4()}/passport-1.jpg")

    staff = Principal(id="s", type="staff", role="viewer", token_id="t")
    assert staff.may_touch_key("anything/at/all")
