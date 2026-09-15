"""
SETTINGS — validated once, with the failure at the right time.

The same rule as `src/lib/env.ts` on the web side:

  * in production a missing required value is fatal at startup, with a message
    naming what breaks without it;
  * in development everything degrades to a documented local mode, so a fresh
    clone runs without AWS credentials.

A blank variable (`KEY=`) is treated as absent (`env_ignore_empty`), because
`.env.example` is copied with most lines left empty and an empty string is not
a valid URL — that exact mistake once took the web login form down.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["development", "test", "production"]

# Only ever used outside production. Long enough to satisfy the length check so
# that development exercises the same verification path as production.
_DEVELOPMENT_JWT_SECRET = "development-only-insecure-service-secret-do-not-deploy"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore",
    )

    environment: Environment = "development"
    log_level: str = "INFO"
    # JSON list in the environment, e.g. `["api", "localhost"]`. The API is only
    # reachable from inside the Docker network, so this names container hosts.
    allowed_hosts: list[str] = Field(default_factory=lambda: ["*"])

    # --- Database (RDS Postgres) ---------------------------------------------
    # `postgresql+asyncpg://…`. This service owns the `svc` schema and nothing
    # else; the web app's Drizzle tables live in `public` and are not ours.
    database_url: str | None = None
    database_pool_size: int = Field(5, ge=1, le=50)

    # --- Redis: rate limiting and the Celery broker ---------------------------
    redis_url: str | None = None
    celery_broker_url: str | None = None
    celery_result_backend: str | None = None

    # --- Service-to-service authentication ------------------------------------
    # Shared with the web app, which signs a 60-second token per call. Separate
    # from AUTH_SECRET and OPS_SESSION_SECRET: leaking a browser cookie secret
    # must not also mint backend credentials.
    service_jwt_secret: SecretStr | None = None
    service_jwt_issuer: str = "abizon-web"
    service_jwt_audience: str = "abizon-backend"

    # --- AWS -------------------------------------------------------------------
    # No access keys here, on purpose. On EC2 boto3 reads the instance profile;
    # locally it reads `~/.aws` or the MinIO credentials in docker-compose.
    aws_region: str = "ap-south-1"
    s3_bucket: str | None = None
    s3_endpoint_url: str | None = None  # MinIO locally; unset on AWS
    upload_url_ttl_seconds: int = Field(300, ge=30, le=3600)
    view_url_ttl_seconds: int = Field(60, ge=10, le=900)
    max_upload_bytes: int = Field(15 * 1024 * 1024, ge=1)
    # Raw camera output older than this is deleted by the hourly beat task.
    incoming_max_age_seconds: int = Field(3600, ge=300)

    bedrock_region: str | None = None  # defaults to aws_region
    bedrock_model: str = "anthropic.claude-opus-5"
    ai_max_output_tokens: int = Field(16000, ge=256, le=64000)

    # --- Scheduled calls into the web app --------------------------------------
    # Celery beat replaces Vercel Cron: it calls the web app's /api/cron/* routes
    # with the same bearer secret those routes already check.
    web_internal_url: str | None = None
    cron_secret: SecretStr | None = None

    # ---------------------------------------------------------------------------

    @field_validator("database_url")
    @classmethod
    def _async_driver(cls, value: str | None) -> str | None:
        if value is None:
            return value
        if not value.startswith(("postgresql+asyncpg://", "sqlite+aiosqlite://")):
            raise ValueError(
                "must use an async driver: postgresql+asyncpg://… "
                "(a plain postgres:// URL would load the sync driver and block the event loop)"
            )
        return value

    @model_validator(mode="after")
    def _production_requirements(self) -> Settings:
        if self.environment != "production":
            return self

        required = {
            "DATABASE_URL": (self.database_url, "jobs cannot be recorded"),
            "REDIS_URL": (self.redis_url, "rate limits would count per process and Celery has no broker"),
            "SERVICE_JWT_SECRET": (self.service_jwt_secret, "no caller could be authenticated"),
            "S3_BUCKET": (self.s3_bucket, "documents cannot be stored"),
            "WEB_INTERNAL_URL": (self.web_internal_url, "the retention and purge jobs would never run"),
            "CRON_SECRET": (self.cron_secret, "the web app's cron routes would refuse beat"),
        }
        missing = [f"  {key} — without it, {why}." for key, (value, why) in required.items() if not value]

        secret = self.service_jwt_secret.get_secret_value() if self.service_jwt_secret else ""
        if secret and len(secret) < 32:
            missing.append("  SERVICE_JWT_SECRET — must be at least 32 characters.")
        if self.database_url and self.database_url.startswith("sqlite"):
            missing.append("  DATABASE_URL — SQLite is for tests only.")

        if missing:
            raise ValueError("Environment is incomplete:\n" + "\n".join(missing))
        return self

    # ---------------------------------------------------------------------------

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    def jwt_secret(self) -> str:
        if self.service_jwt_secret:
            return self.service_jwt_secret.get_secret_value()
        # Unreachable in production: the validator above refuses to start.
        return _DEVELOPMENT_JWT_SECRET

    @property
    def broker_url(self) -> str:
        return self.celery_broker_url or self.redis_url or "memory://"

    @property
    def result_backend(self) -> str | None:
        # Job state lives in Postgres (`svc.jobs`), which is queryable and
        # durable. A Celery result backend would be a second, disagreeing copy.
        return self.celery_result_backend

    @property
    def effective_bedrock_region(self) -> str:
        return self.bedrock_region or self.aws_region


@lru_cache
def get_settings() -> Settings:
    return Settings()
