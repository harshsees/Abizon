# Abizon backend report

Last updated 15 September 2026.

The client chose three things:
- **Architecture:** a Python service that runs *alongside* the Next.js app. It is not a rewrite.
- **Hosting:** everything on AWS, the web app included.
- **AI:** Claude through Amazon Bedrock.

The AI CRM's features are on hold until its scope is decided.

## What the stack already had

These were already in the TypeScript backend in `src/`:
- middleware
- rate limiting
- authentication
- ORM
- guards
- ACID transactions
- async IO

RBAC and exception handling existed only in part.

## What was built

A Python service in `backend/`. Login, the apply flow, Razorpay and `/ops` stay in `src/`.

| Tool | Where it lives |
|---|---|
| Middleware | `backend/app/middleware/`: request ID, access log, security headers, body size limit |
| Exceptions | `backend/app/core/exceptions.py`: one error envelope; never echoes submitted values |
| Rate limit | Redis sliding window, per authenticated caller |
| Authentication + guards | 60-second service token from the web app; every route declares its permission |
| RBAC in a JSON file | `backend/app/core/rbac.json`, validated at startup: a bad file stops the service |
| ORM | SQLAlchemy async + Alembic, in its own Postgres schema `svc` |
| ACID | One transaction per unit of work; a job can't run twice; retries return the same job |
| Context managers | App lifespan, database transactions, request logging, AWS error handling, Celery tasks |
| Celery (background tasks) | Redis broker, retries with backoff; hourly purge of raw uploads; runs the jobs Vercel Cron used to run |
| Microservice | Separate service, schema and AWS role; the web app calls it over a private network |
| boto3 / S3 | Documents moved from Supabase to S3; the web app holds no storage credentials |
| AI (Bedrock) | Claude Opus 5 behind one job endpoint, `/v1/jobs/ai-completions`; retries once on Opus 4.8 if Opus 5 refuses. CRM features not built |
| Docker, EC2, RDS | `backend/Dockerfile`, `Dockerfile`, `docker-compose.yml`, `deploy/`, `infra/aws/README.md` (setup runbook) |
| Folder structure | `backend/README.md` |

Changes in the web app:
- the Supabase SDK and `vercel.json` are removed
- the app builds as a standalone server for Docker
- CI lints and tests the backend and builds both images

## What was checked

- **Backend:** 77/77 tests pass; ruff lint is clean.
- **Web app:** typecheck passes; 327/327 unit tests pass; lint has 0 errors.
- **Migration:** Alembic renders the SQL correctly.
- **Tokens:** a token signed by the web app was decoded by the Python service with the right role and permissions.

## What has not been checked

- **Production build and Docker images:** `npm run build` was killed for low memory on the development machine, and Docker Desktop was not running. CI builds both.
- **Real AWS:** nothing has run against it. Tests use stand-ins for S3, Postgres, Redis and the AI model.
- **Job locking:** the lock that stops two workers claiming the same job only works on real Postgres.
- **Bedrock permissions:** the IAM actions it needs should be confirmed when model access is turned on.

## Subscriptions to ask the client for

All in the client's name, in ap-south-1 (Mumbai). Prices are rough estimates; confirm them in the AWS Pricing Calculator.

1. **An AWS account** with billing set up. Everything below sits inside it.
2. **EC2:** one t3.medium server with an Elastic IP (about $35–45/month).
3. **RDS Postgres 16:** db.t4g.small (about $25–35/month; double that with a standby copy).
4. **S3:** a few cents a month at launch volume.
5. **Amazon Bedrock**, with Anthropic model access turned on (needs a short use-case form). Pay per use, no subscription.
6. **ECR** for images, **CloudWatch** for logs and a billing alarm, **Route 53** for DNS: a few dollars a month together.
7. **A domain name.**
8. **Still needed from before:** MSG91 with DLT registration, Razorpay, Resend, Cloudflare Turnstile. Sentry, PostHog and Upstash can stay on free tiers.
9. **No longer needed:** Supabase and Vercel.
