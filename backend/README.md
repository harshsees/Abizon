# Abizon backend service

A Python service that runs next to the Next.js app. It owns three things the web
app should not hold credentials for:

- **documents on S3**: it signs every upload and view URL, checks sizes, and deletes
- **background work**: Celery workers and the beat schedule that replaced Vercel Cron
- **Claude on Amazon Bedrock**: the base the AI CRM will be built on (the CRM's scope is not decided yet)

It is not a rewrite of the web backend. Applicant login, applications, payments
and the ops console stay in `src/`, where they already work and are tested. People
sign in to the web app; the web app calls this service for them.

```
 browser ──HTTPS──▶ Caddy ──▶ web (Next.js) ──JWT, private network──▶ api (FastAPI)
    │                              │                                   │   │
    │                              └──── RDS Postgres (public schema)  │   └──▶ Redis ──▶ worker / beat
    │                                    RDS Postgres (svc schema) ◀───┘
    └──── presigned PUT/GET ─────────────────────────────▶ S3 ◀── api, worker (IAM role)
                                                           Bedrock ◀── worker (IAM role)
```

---

## The tools, and where each one lives

| Tool | Where | What it does here |
|---|---|---|
| **Middleware** | `app/middleware/`, order set in `app/main.py` | Request ID and JSON access log; converts unhandled errors into a 500 that keeps the request ID; security headers; body size limit; trusted hosts |
| **Exception handling** | `app/core/exceptions.py` | One error envelope `{error: {code, message, request_id}}`. Validation errors name the field but never echo the value |
| **Rate limiting** | `app/services/rate_limit.py`, applied by `rate_limit()` in `app/api/deps.py` | Sliding window in Redis per authenticated caller; named limits in `LIMITS`; fails open if Redis is down |
| **Authentication** | `app/core/security.py` ↔ `src/lib/backend/client.ts` | 60-second HS256 service token naming the applicant (with their storage key prefix), staff member (with role) or system |
| **Guards** | `app/api/deps.py` | `current_principal`, `require_permission("…")`, `rate_limit("…")` as FastAPI dependencies; names checked at import |
| **RBAC in JSON** | `app/core/rbac.json` + `app/core/rbac.py` | Roles, inheritance, wildcard grants. Validated at startup: cycles, unknown roles or unknown permissions stop the process |
| **ORM** | `app/db/` (SQLAlchemy 2.0 async), `migrations/` (Alembic) | Owns Postgres schema `svc` only; the web app's Drizzle tables are in `public` |
| **ACID** | `app/db/session.py` `unit_of_work()`, `app/services/jobs.py` | One transaction per unit of work; `SELECT … FOR UPDATE` claims; finishing a job and recording usage commit together; idempotency keys backed by a unique constraint |
| **Context managers** | `lifespan` in `main.py`, `unit_of_work`, `request_id_scope` and `timed` in `core/logging.py`, `aws_errors` in `services/aws.py`, `task_context` in `worker/runtime.py` | Every resource with a lifetime is opened and closed by one |
| **Async IO** | Async routes, `asyncpg`, `redis.asyncio`, `asyncio.gather` + `asyncio.timeout` in `/health/ready`, `asyncio.to_thread` around boto3 | Nothing blocks the event loop |
| **Pydantic** | `app/schemas/`, `app/core/config.py`, `PolicyDocument` | Request/response contracts, settings validation, policy file validation |
| **Background tasks (Celery + broker)** | `app/worker/` | Redis broker, `acks_late`, retries with backoff, beat schedule, and a requeue job for anything lost on the way to the broker |
| **Microservice** | this folder | Separate deployable, separate database schema, separate IAM role, and an authenticated API contract with the web app |
| **boto3 / S3** | `app/services/aws.py`, `app/services/storage.py` | Regional virtual-hosted presigning, size check before read-back, batched deletes, hourly purge |
| **AI (Bedrock)** | `app/services/ai.py`, `POST /v1/jobs/ai-completions` | Claude Opus 5 through the Bedrock Mantle client; refusal fallback to Opus 4.8; token usage recorded; prompts scrubbed after 7 days |
| **Docker** | `Dockerfile` here and at the repo root; `docker-compose.yml`; `deploy/docker-compose.prod.yml` | One backend image for api, worker, beat and migrate |
| **EC2, RDS, S3 setup** | `infra/aws/` | IAM policy, bucket CORS/lifecycle/policy, and the step-by-step runbook |

---

## Folder structure

```
Abizon/
├── src/                          Next.js web app: UI, sign-in, applications, payments, /ops
│   └── lib/backend/client.ts     signs service tokens and calls this service
├── backend/                      ← this service
│   ├── app/
│   │   ├── main.py               app factory, lifespan, middleware order
│   │   ├── core/                 config · exceptions · logging · security · rbac.py + rbac.json
│   │   ├── middleware/           request_context.py · security.py
│   │   ├── api/
│   │   │   ├── deps.py           guards: principal, permission, rate limit, services
│   │   │   ├── health.py         /health/live, /health/ready
│   │   │   └── v1/               storage.py · jobs.py
│   │   ├── schemas/              Pydantic request and response models
│   │   ├── db/                   base.py (svc schema) · models.py · session.py (unit of work)
│   │   ├── services/             storage · aws · ai · jobs · rate_limit   (no FastAPI imports)
│   │   └── worker/               celery_app.py (beat) · tasks.py · dispatch.py · runtime.py
│   ├── migrations/               Alembic (env.py + versions/)
│   ├── tests/                    pytest: SQLite, moto, fakeredis. No network needed
│   ├── Dockerfile · pyproject.toml · alembic.ini · .env.example
├── deploy/                       EC2: docker-compose.prod.yml · Caddyfile
├── infra/aws/                    IAM and S3 policy JSON · README.md (runbook)
├── docker-compose.yml            local stack
└── Dockerfile                    web app image
```

The layering rule: `api/` depends on `services/`, and `services/` depends on `db/` and `core/`.
Nothing in `services/` imports FastAPI, which is why Celery tasks can call the same code
the routes do.

---

## API

| Method and path | Permission | Notes |
|---|---|---|
| `GET /health/live` | none | Process is up |
| `GET /health/ready` | none | `{database, redis, storage}`; 503 only if the database is down |
| `POST /v1/storage/incoming/upload-url` | `storage.incoming.write` | Browser PUTs raw upload; applicants confined to their key prefix |
| `POST /v1/storage/incoming/download-url` | `storage.incoming.read` | Size-checked first; oversize → 413 and deleted |
| `POST /v1/storage/documents/upload-url` | `storage.documents.write` | JPEG only |
| `POST /v1/storage/documents/view-url` | `storage.documents.read` | 60 seconds, inline |
| `POST /v1/storage/delete` | `storage.<area>.delete` | Up to 1,000 keys |
| `POST /v1/jobs/ai-completions` | `ai.invoke` + `jobs.create` | 202 + job; `Idempotency-Key` header optional |
| `GET /v1/jobs/{id}` | `jobs.read` | Applicants see only their own |

Interactive docs at `http://localhost:8000/docs` outside production.

---

## Running it

**Tests and lint** (no Docker, no AWS):

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows;  source .venv/bin/activate elsewhere
pip install -e ".[dev]"
pytest
ruff check .
alembic upgrade head --sql      # render the migration without a database
```

**The whole stack**, with Docker Desktop running, from the repo root:

```bash
docker compose up --build
```

That runs Postgres, Redis, a moto S3 stand-in, migrations, the API on
`localhost:8000`, a worker and beat. `docker-compose.yml` explains how to point
`npm run dev` at it.

**Production:** `infra/aws/README.md`.

---

## What is not verified yet

- Nothing has run against real AWS: no real bucket, RDS instance or Bedrock call. Tests use moto, SQLite and a fake model.
- The Docker images have not been built on this machine (Docker Desktop was not running). CI builds both.
- `FOR UPDATE` locking only matters on Postgres. SQLite in the tests ignores it, so the concurrent-claim guarantee still needs one run against the compose Postgres.
- Bedrock's IAM actions for the Mantle (Messages API) endpoint should be confirmed against AWS's documentation when model access is enabled. `infra/aws/iam-policy.json` grants `bedrock:InvokeModel*`.
