# Abizon

Visa applications for Indian travellers: destination pages, a guided apply flow
with passport scanning, payments, tracking, and an ops console for staff.

## Structure

| Path | What |
|---|---|
| `src/` | Next.js web app: pages, applicant sign-in, applications, Razorpay, `/ops` |
| `backend/` | Python service: documents on S3, Celery background jobs, Claude on Bedrock. See [`backend/README.md`](backend/README.md) |
| `deploy/` | Production Docker Compose and Caddy config for EC2 |
| `infra/aws/` | IAM and S3 policies, and the AWS runbook: [`infra/aws/README.md`](infra/aws/README.md) |
| `docs/backend/` | Architecture history, what was built, the go-live checklist |
| `e2e/` | Playwright end-to-end tests |

## Develop

```bash
npm install
npm run dev                 # http://localhost:3000
npm test                    # unit tests
npm run typecheck && npm run lint
```

The web app starts with no configuration; every integration has a documented
local fallback (see `.env.example`). For documents, jobs and AI, run the backend
stack too, with Docker Desktop running:

```bash
docker compose up --build   # Postgres, Redis, S3 stand-in, API on :8000, worker, beat
```

## Deploy

Everything runs on AWS in ap-south-1: EC2, RDS, S3, Bedrock. Follow
[`infra/aws/README.md`](infra/aws/README.md).
