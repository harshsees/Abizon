import json
from pathlib import Path

import pytest

from app.core.rbac import POLICY_PATH, PolicyDocument, load_policy


@pytest.fixture(scope="module")
def policy():
    return load_policy()


def test_shipped_policy_loads(policy) -> None:
    assert {"applicant", "viewer", "processor", "admin", "system"} <= set(policy.grants)


def test_staff_roles_nest_like_the_ops_console(policy) -> None:
    viewer = policy.permissions_for("viewer")
    processor = policy.permissions_for("processor")
    admin = policy.permissions_for("admin")
    assert viewer < processor < admin


@pytest.mark.parametrize(
    ("role", "permission", "allowed"),
    [
        ("viewer", "storage.documents.read", True),
        ("viewer", "ai.invoke", False),
        ("processor", "ai.invoke", True),
        ("processor", "storage.documents.delete", False),
        ("admin", "storage.documents.delete", True),
        ("applicant", "storage.incoming.write", True),
        # An applicant may store and replace their documents but never view
        # anyone's through this service — viewing is a staff action.
        ("applicant", "storage.documents.read", False),
        ("applicant", "ai.invoke", False),
        ("system", "storage.documents.delete", True),
    ],
)
def test_grants(policy, role: str, permission: str, allowed: bool) -> None:
    assert policy.allows(role, permission) is allowed


def test_unknown_role_is_denied(policy) -> None:
    assert policy.allows("superuser", "jobs.read") is False


def test_unknown_permission_is_a_programming_error(policy) -> None:
    with pytest.raises(KeyError):
        policy.allows("admin", "storage.document.read")  # misspelt


def _write(tmp_path: Path, mutate) -> Path:
    document = json.loads(POLICY_PATH.read_text(encoding="utf-8"))
    mutate(document)
    path = tmp_path / "rbac.json"
    path.write_text(json.dumps(document), encoding="utf-8")
    return path


def test_inheritance_cycle_is_rejected(tmp_path: Path) -> None:
    path = _write(tmp_path, lambda d: d["roles"]["viewer"]["inherits"].append("admin"))
    with pytest.raises(ValueError, match="cycle"):
        load_policy(path)


def test_unknown_parent_is_rejected(tmp_path: Path) -> None:
    path = _write(tmp_path, lambda d: d["roles"]["viewer"]["inherits"].append("manager"))
    with pytest.raises(ValueError, match="unknown role"):
        load_policy(path)


def test_grant_of_nonexistent_permission_is_rejected(tmp_path: Path) -> None:
    path = _write(tmp_path, lambda d: d["roles"]["viewer"]["permissions"].append("billing.refund"))
    with pytest.raises(ValueError, match="matches no permission"):
        load_policy(path)


def test_document_schema_rejects_unknown_version() -> None:
    document = json.loads(POLICY_PATH.read_text(encoding="utf-8"))
    document["version"] = 2
    with pytest.raises(ValueError):
        PolicyDocument.model_validate(document)
