# syntax=docker/dockerfile:1.7
#
# One image, three processes — the command decides which:
#
#   api      uvicorn app.main:app …                        (default CMD)
#   worker   celery -A app.worker.celery_app:celery_app worker
#   beat     celery -A app.worker.celery_app:celery_app beat
#   migrate  alembic upgrade head
#
# Building the same image for all of them means the worker can never run code
# from a different commit than the API that enqueued its job.

FROM python:3.13-slim AS deps
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /build
COPY pyproject.toml ./
# Dependencies only, read straight from pyproject.toml, so this layer is rebuilt
# when a pin changes and not when a line of application code does.
RUN python -c "import tomllib; print('\n'.join(tomllib.load(open('pyproject.toml','rb'))['project']['dependencies']))" > requirements.txt \
 && python -m venv /opt/venv \
 && /opt/venv/bin/pip install -r requirements.txt

FROM python:3.13-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

# Never root. A remote-code-execution bug in a dependency should land in an
# account that owns nothing.
RUN groupadd --system app && useradd --system --gid app --home-dir /srv --no-create-home app

WORKDIR /srv
COPY --from=deps /opt/venv /opt/venv
COPY --chown=app:app alembic.ini ./
COPY --chown=app:app migrations ./migrations
COPY --chown=app:app app ./app

USER app
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/live', timeout=2)" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--no-server-header"]
