"""
ROLE-BASED ACCESS CONTROL — the policy is data, in `rbac.json`.

Why a JSON file rather than `if role == "admin"` in each route:

  * "what can a processor do" has one answer, readable by someone who does not
    read Python — the client can review it;
  * changing a grant is a reviewed one-line diff to data, not a hunt through
    route handlers;
  * the file is validated when the service starts. A typo in a role name, an
    inheritance cycle, or a grant of a permission that does not exist stops the
    process instead of silently granting or denying at 2 a.m.

The staff roles (`viewer` < `processor` < `admin`) are the same three the ops
console uses (`src/lib/ops/dal.ts`), with the same nesting, so a staff member's
role passes through from the web app unchanged.

Deny by default: an unknown role has no permissions. Asking about a permission
that is not in the catalogue is a programming error and raises, so a misspelt
`require_permission("storage.document.read")` fails its first test rather than
denying everyone in production.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field, model_validator

POLICY_PATH = Path(__file__).with_name("rbac.json")


class RoleDefinition(BaseModel):
    description: str
    inherits: list[str] = Field(default_factory=list)
    permissions: list[str]


class PolicyDocument(BaseModel):
    version: Literal[1]
    permissions: dict[str, str]
    roles: dict[str, RoleDefinition]

    @model_validator(mode="after")
    def _consistent(self) -> PolicyDocument:
        problems: list[str] = []
        catalogue = set(self.permissions)

        for name, role in self.roles.items():
            for parent in role.inherits:
                if parent not in self.roles:
                    problems.append(f"role {name!r} inherits unknown role {parent!r}")
            for grant in role.permissions:
                if not any(_matches(grant, permission) for permission in catalogue):
                    problems.append(f"role {name!r} grants {grant!r}, which matches no permission")

        # Cycle check: depth-first over `inherits`.
        def visit(name: str, trail: tuple[str, ...]) -> None:
            if name in trail:
                problems.append("inheritance cycle: " + " -> ".join((*trail, name)))
                return
            for parent in self.roles.get(name, RoleDefinition(description="", permissions=[])).inherits:
                visit(parent, (*trail, name))

        for name in self.roles:
            visit(name, ())

        if problems:
            raise ValueError("Invalid RBAC policy:\n  " + "\n  ".join(sorted(set(problems))))
        return self


def _matches(grant: str, permission: str) -> bool:
    """`*` matches everything; `storage.*` matches `storage.documents.read`."""
    if grant == "*" or grant == permission:
        return True
    if grant.endswith(".*"):
        return permission.startswith(grant[:-1])
    return False


@dataclass(frozen=True, slots=True)
class Policy:
    catalogue: frozenset[str]
    grants: dict[str, frozenset[str]]  # role -> effective grants, inheritance resolved

    @classmethod
    def from_document(cls, document: PolicyDocument) -> Policy:
        def effective(role: str) -> set[str]:
            definition = document.roles[role]
            collected = set(definition.permissions)
            for parent in definition.inherits:
                collected |= effective(parent)
            return collected

        return cls(
            catalogue=frozenset(document.permissions),
            grants={role: frozenset(effective(role)) for role in document.roles},
        )

    def allows(self, role: str, permission: str) -> bool:
        if permission not in self.catalogue:
            raise KeyError(f"Unknown permission {permission!r}; add it to rbac.json first.")
        return any(_matches(grant, permission) for grant in self.grants.get(role, frozenset()))

    def permissions_for(self, role: str) -> set[str]:
        return {p for p in self.catalogue if self.allows(role, p)}


def load_policy(path: Path = POLICY_PATH) -> Policy:
    document = PolicyDocument.model_validate(json.loads(path.read_text(encoding="utf-8")))
    return Policy.from_document(document)


@lru_cache
def get_policy() -> Policy:
    return load_policy()
