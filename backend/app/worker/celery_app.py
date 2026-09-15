"""
CELERY — the broker-backed task queue, and the schedule that replaces Vercel Cron.

    celery -A app.worker.celery_app:celery_app worker --loglevel INFO
    celery -A app.worker.celery_app:celery_app beat   --loglevel INFO

Broker: Redis (a container on the EC2 host at launch; ElastiCache when it needs
to survive the host). Results are not stored in Celery — job state is in
Postgres, see `app/services/jobs.py`.

Delivery settings, each chosen for a paid, slow task:

  acks_late + reject_on_worker_lost   the message is acknowledged after the task
                                      finishes, so a worker killed mid-task has
                                      its job redelivered, not lost. That makes
                                      delivery at-least-once, which `JobService.claim`
                                      turns back into exactly-once execution.
  prefetch_multiplier = 1             a worker holds one message at a time, so a
                                      long Claude call does not strand others.
  visibility_timeout > time_limit     otherwise Redis redelivers a task that is
                                      still legitimately running.
"""

from __future__ import annotations

from typing import Any

from celery import Celery, signals
from celery.schedules import crontab

from app.core.config import get_settings
from app.core.logging import configure_logging

settings = get_settings()

celery_app = Celery(
    "abizon",
    broker=settings.broker_url,
    backend=settings.result_backend,
    include=["app.worker.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    task_ignore_result=True,
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_time_limit=600,
    task_soft_time_limit=540,
    broker_transport_options={"visibility_timeout": 3600},
    broker_connection_retry_on_startup=True,
    worker_hijack_root_logger=False,
    beat_schedule={
        # Raw camera output should not outlive its purpose by a day. On Vercel
        # Hobby this could only run daily; here it runs hourly.
        "purge-incoming-uploads": {
            "task": "maintenance.purge_incoming",
            "schedule": crontab(minute=5),
        },
        "requeue-stale-jobs": {
            "task": "maintenance.requeue_stale_jobs",
            "schedule": 300.0,
        },
        "expire-job-data": {
            "task": "maintenance.expire_job_data",
            "schedule": crontab(minute=30, hour=1),
        },
        # The web app's own jobs, which were Vercel Cron entries in vercel.json.
        "web-retention": {
            "task": "maintenance.call_web_cron",
            "schedule": crontab(minute=40, hour=2),
            "args": ("retention",),
        },
        "web-purge": {
            "task": "maintenance.call_web_cron",
            "schedule": crontab(minute=17),
            "args": ("purge",),
        },
    },
)


@signals.setup_logging.connect
def _json_logging(**_: Any) -> None:
    configure_logging(settings.log_level)
