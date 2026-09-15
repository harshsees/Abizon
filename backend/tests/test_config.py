import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_production_names_every_missing_variable(monkeypatch) -> None:
    for name in ["DATABASE_URL", "REDIS_URL", "SERVICE_JWT_SECRET", "S3_BUCKET", "WEB_INTERNAL_URL", "CRON_SECRET"]:
        monkeypatch.delenv(name, raising=False)

    with pytest.raises(ValidationError) as caught:
        Settings(_env_file=None, environment="production")

    message = str(caught.value)
    for name in ["DATABASE_URL", "REDIS_URL", "SERVICE_JWT_SECRET", "S3_BUCKET", "WEB_INTERNAL_URL", "CRON_SECRET"]:
        assert name in message


def test_sync_postgres_driver_is_refused() -> None:
    with pytest.raises(ValidationError, match="async driver"):
        Settings(_env_file=None, database_url="postgresql://user@host/db")


def test_blank_variable_is_absent(monkeypatch) -> None:
    monkeypatch.setenv("S3_BUCKET", "")
    assert Settings(_env_file=None).s3_bucket is None


def test_short_production_secret_is_refused() -> None:
    with pytest.raises(ValidationError, match="at least 32"):
        Settings(
            _env_file=None,
            environment="production",
            database_url="postgresql+asyncpg://u@h/db",
            redis_url="redis://r:6379/0",
            service_jwt_secret="short",
            s3_bucket="b",
            web_internal_url="http://web:3000",
            cron_secret="c" * 40,
        )


def test_development_signs_with_a_fallback_secret() -> None:
    assert len(Settings(_env_file=None, environment="development").jwt_secret()) >= 32
