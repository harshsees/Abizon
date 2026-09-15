# Abizon on AWS: the runbook

Everything runs in **ap-south-1 (Mumbai)**, in the client's own AWS account. You
are invited as an IAM user; the root account and billing stay with the client.

```
                         Route 53 (DNS)
                               │
                        Elastic IP, :443
                               │
 ┌──────────────────── EC2 (t3.medium, Amazon Linux 2023) ────────────────────┐
 │  caddy ─▶ web (Next.js) ─▶ api (FastAPI) ─▶ redis ◀─ worker, beat (Celery) │
 └───────────────┬──────────────────┬───────────────────────────┬─────────────┘
                 │ 5432, private    │ IAM role                  │ awslogs
          RDS Postgres 16      S3 bucket (private)         CloudWatch Logs
       public: web (Drizzle)   incoming/  documents/
       svc:    api (Alembic)   Bedrock: Claude Opus 5
```

Only 80 and 443 are open to the internet. No SSH: shell access is through SSM
Session Manager, which is logged and needs no open port or key file.

---

## 0. Accounts and subscriptions to ask the client for

| # | What | Why | Cost model (estimate, check the AWS Pricing Calculator) |
|---|---|---|---|
| 1 | **AWS account** in the client's name, with a card on file | Everything below | Pay as you go |
| 2 | **EC2** t3.medium (2 vCPU, 4 GB) + 30 GB gp3 + Elastic IP | Web, API, workers, Redis, Caddy | roughly $35–45/month |
| 3 | **RDS for PostgreSQL 16**, db.t4g.small, 20 GB gp3, 7-day backups | Both services' data | roughly $25–35/month; Multi-AZ doubles it |
| 4 | **S3** (Standard) | Passport scans and photographs | cents at launch volume |
| 5 | **Amazon Bedrock**, with Anthropic model access enabled | Claude for the AI assistant | per token, only when used; no subscription |
| 6 | **ECR** | Stores the two Docker images | under $1/month |
| 7 | **CloudWatch** Logs + a billing alarm | Logs, alerts | a few dollars/month |
| 8 | **Route 53** hosted zone | DNS for the domain | about $0.50/month + queries |
| 9 | **SSM Parameter Store** (standard) | Secrets | free tier |
| 10 | **A domain name** | HTTPS, email, Turnstile | about ₹1,000–2,000/year |
| 11 | *Optional later:* ElastiCache, RDS Multi-AZ, a second EC2 + load balancer | High availability | when traffic justifies it |

**Still needed from before**, unchanged by the move: MSG91 + TRAI DLT
registration, Razorpay, Resend, Cloudflare Turnstile (free), Sentry and PostHog
(free tiers), and Upstash Redis for the web app's rate limits (free tier).
Supabase and Vercel are **no longer needed**.

---

## 1. Account guard rails (10 minutes, do first)

1. Turn on MFA for the root user, then stop using root.
2. Create an IAM user (or Identity Center user) for each engineer, with MFA.
3. **Billing → Budgets**: a monthly budget with an email alert at 80%.
4. Region selector: **Asia Pacific (Mumbai) ap-south-1** for every step below.

## 2. S3 bucket

1. Create bucket `abizon-documents-<suffix>` in ap-south-1.
   - **Block all public access: on** (all four boxes).
   - **Default encryption:** SSE-S3.
   - **Versioning: off.** With versioning on, "deleted" passport scans remain as
     noncurrent versions, and the retention and erasure jobs would delete
     nothing. Turning it on is a DPDP decision, not a durability tweak.
2. Permissions → CORS: paste `s3-cors.json` with your domain in place of `SITE_DOMAIN`.
3. Permissions → Bucket policy: paste `s3-bucket-policy.json` with the bucket name.
4. Management → Lifecycle: create the rule in `s3-lifecycle.json`, or apply it with
   the CLI: `aws s3api put-bucket-lifecycle-configuration --bucket <name> --lifecycle-configuration file://s3-lifecycle.json`.

`STORAGE_ORIGIN` for the web app is then `https://<bucket>.s3.ap-south-1.amazonaws.com`.

## 3. RDS Postgres

1. Create a database: PostgreSQL 16, **db.t4g.small**, 20 GB gp3, storage autoscaling on.
2. **Public access: No.** Put it in the default VPC's private subnets.
3. Security group: inbound 5432 **only from the EC2 instance's security group**.
4. Encryption at rest on; automated backups 7 days; deletion protection on.
5. Connect once (SSM port forward from your machine) and create one role per service:

```sql
CREATE ROLE abizon_web     LOGIN PASSWORD '<generate>';
CREATE ROLE abizon_backend LOGIN PASSWORD '<generate>';
GRANT ALL ON SCHEMA public TO abizon_web;

CREATE SCHEMA svc AUTHORIZATION abizon_backend;
REVOKE ALL ON SCHEMA svc FROM PUBLIC;
```

The two roles are what enforce the service boundary: the backend cannot touch
the web app's tables, and the web app cannot touch `svc`.

Connection strings, both over TLS:

```
web      DATABASE_URL=postgres://abizon_web:<pw>@<endpoint>:5432/abizon?sslmode=require
         DIRECT_URL=<same>
backend  DATABASE_URL=postgresql+asyncpg://abizon_backend:<pw>@<endpoint>:5432/abizon?ssl=require
```

(There is no connection pooler on RDS by default, and none is needed: the app is a
long-lived server now, not serverless functions.)

## 4. IAM role for the instance

1. IAM → Policies → Create: paste `iam-policy.json`, replacing `BUCKET_NAME` and `ACCOUNT_ID`.
2. IAM → Roles → Create, trusted entity **EC2**; attach that policy **and**
   `AmazonSSMManagedInstanceCore`.

No access keys exist anywhere. boto3 and the Docker log driver use this role.

## 5. Bedrock model access

Bedrock → Model access → request access to the Anthropic models (Claude Opus 5,
and Claude Opus 4.8 for the refusal fallback). Anthropic models require a short
use-case form. Until access is granted, every AI job fails with `ai_error`.
Confirm the models are offered in ap-south-1; if not, set `BEDROCK_REGION` in
the backend's environment to a region that has them. That is a cross-border data
transfer, and a DPDP question for the client, not only a config change.

## 6. ECR and images

```bash
aws ecr create-repository --repository-name abizon-web
aws ecr create-repository --repository-name abizon-backend
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.ap-south-1.amazonaws.com

TAG=$(git rev-parse --short HEAD)
REG=<account>.dkr.ecr.ap-south-1.amazonaws.com

docker build -t $REG/abizon-backend:$TAG backend
docker build -t $REG/abizon-web:$TAG \
  --build-arg STORAGE_ORIGIN=https://<bucket>.s3.ap-south-1.amazonaws.com \
  --build-arg SITE_URL=https://<domain> \
  --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY=<key> \
  --build-arg NEXT_PUBLIC_RAZORPAY_KEY_ID=<key> .
docker build -t $REG/abizon-web:$TAG-migrate --target migrate .

docker push $REG/abizon-backend:$TAG
docker push $REG/abizon-web:$TAG
docker push $REG/abizon-web:$TAG-migrate
```

## 7. EC2

1. Launch **t3.medium**, Amazon Linux 2023, 30 GB gp3, the IAM role from step 4.
2. Security group: inbound **80 and 443 from anywhere**, nothing else.
3. Allocate an **Elastic IP** and associate it.
4. Connect with Session Manager and install Docker:

```bash
sudo dnf install -y docker
sudo systemctl enable --now docker
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -sSL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
```

5. Copy `deploy/` to `/srv/abizon/` on the instance.

## 8. DNS

Route 53 → hosted zone for the domain → `A` records for `@` and `www` to the
Elastic IP. Caddy obtains the certificate on first start once these resolve.

## 9. Secrets → environment files

Store every secret in **SSM Parameter Store** as `SecureString` under
`/abizon/production/web/*` and `/abizon/production/backend/*`, then write the
files on the instance (they are gitignored and never leave it):

```bash
cd /srv/abizon && mkdir -p env
for svc in web backend; do
  aws ssm get-parameters-by-path --path /abizon/production/$svc --with-decryption \
    --query 'Parameters[].[Name,Value]' --output text \
  | sed -E "s#^/abizon/production/$svc/##; s#\t#=#" > env/$svc.env
done
chmod 600 env/*.env
```

**Web** (`env/web.env`): everything in the root `.env.example`, plus
`BACKEND_URL=http://api:8000`, `SERVICE_JWT_SECRET`, `STORAGE_ORIGIN`,
`NODE_ENV=production`.

**Backend** (`env/backend.env`): everything in `backend/.env.example`, with
`ENVIRONMENT=production`, `ALLOWED_HOSTS=["api"]`, `REDIS_URL=redis://redis:6379/0`,
`WEB_INTERNAL_URL=http://web:3000`, and the **same** `SERVICE_JWT_SECRET` and
`CRON_SECRET` as the web app.

## 10. Deploy

```bash
cd /srv/abizon
export BACKEND_IMAGE=$REG/abizon-backend:$TAG WEB_IMAGE=$REG/abizon-web:$TAG \
       WEB_MIGRATE_IMAGE=$REG/abizon-web:$TAG-migrate SITE_DOMAIN=<domain> ACME_EMAIL=<email>

docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml --profile ops run --rm migrate-web
docker compose -f docker-compose.prod.yml --profile ops run --rm migrate-backend
docker compose -f docker-compose.prod.yml up -d
```

Check from outside: `curl https://<domain>/api/health` should report
`databaseReachable: true` and `backendReachable: true`.

## 11. After go-live

- CloudWatch → Log groups → `/abizon/production`: set retention (30 days is a
  sensible start; logs contain no passport data, but they do contain request paths).
- Alarms: EC2 status check failed, RDS free storage < 2 GB, RDS CPU > 80%.
- RDS: take a manual snapshot before every migration.
- When one instance is no longer enough: move Redis to ElastiCache, turn on RDS
  Multi-AZ, then add a second instance behind an Application Load Balancer. Run
  more `worker` containers, but only ever **one `beat`**.
