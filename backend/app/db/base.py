"""
The declarative base, and the schema boundary between the two services.

This service's tables live in the Postgres schema `svc`. The web app's Drizzle
tables live in `public`. Same RDS instance (one bill, one backup policy), but
two owners who never write each other's tables — which is what makes this a
separate service rather than a second ORM pointed at the same rows.

In production each service connects as its own database role, and the backend
role is granted `USAGE, CREATE` on `svc` only. `infra/aws/README.md` has the
SQL. That grant, not this comment, is what enforces the boundary.

Constraint names are generated from a convention so Alembic migrations name
them identically on every machine; unnamed constraints get server-chosen names
that a later `drop_constraint` cannot target.
"""

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

SCHEMA = "svc"

NAMING_CONVENTION = {
    "ix": "ix_%(table_name)s_%(column_0_N_name)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(schema=SCHEMA, naming_convention=NAMING_CONVENTION)
