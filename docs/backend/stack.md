# Abizon — the complete remaining tech stack

Written 15 August 2026. Companion to `README.md` in this folder.

> **Status: built.** Everything below except payments is implemented in this
> repository. `IMPLEMENTED.md` in this folder is the record of what was built,
> what was verified, what deviated from this document and why, and what is
> deliberately still outstanding. Read that one first if you are picking the
> work up.

`README.md` settled five things: Supabase Postgres, our own auth, MSG91 for SMS,
Razorpay for payments, Vercel for hosting. Those stand and are not re-argued
here. This document names **everything else the product needs before it can take
a real applicant's passport and a real applicant's money**, with the specific
package, the specific version checked on 15 Aug 2026, and the reason.

Every version below was resolved from the npm registry today. Pin what you
install; do not trust these numbers after a few months.

---

## 1. The whole thing on one screen

| Layer | Choice | Package / service | Version |
|---|---|---|---|
| Database | Supabase Postgres, `ap-south-1` | — | PG 16 |
| DB access + migrations | Drizzle ORM | `drizzle-orm`, `drizzle-kit`, `postgres` | 0.45.2, 0.31.10, 3.4.9 |
| Schema → validation | Drizzle-Zod (project already has Zod 4) | `drizzle-zod` | 0.8.3 |
| Auth | Ours, already built | `jose` (installed) | 6.2.8 |
| Field encryption | Node `crypto`, AES-256-GCM | built in | — |
| OTP transport | MSG91, driver already written | plain `fetch` | — |
| Bot protection | Cloudflare Turnstile | plain `fetch` | — |
| Edge rate limiting | Upstash Redis | `@upstash/ratelimit`, `@upstash/redis` | 2.0.8, 1.38.2 |
| File storage | Supabase Storage, private buckets + RLS | `@supabase/supabase-js` | 2.112.3 |
| Image normalisation | Sharp — strips EXIF/GPS | `sharp` | 0.35.3 |
| Transactional email | Resend + React Email | `resend`, `@react-email/components` | 6.20.0, 1.0.12 |
| Invoices / receipts | React-PDF | `@react-pdf/renderer` | 4.6.1 |
| Payments | Razorpay | `razorpay` | 2.9.8 |
| Server action safety | next-safe-action | `next-safe-action` | 8.6.0 |
| Env validation | t3-env | `@t3-oss/env-nextjs` | 0.13.11 |
| Errors | Sentry | `@sentry/nextjs` | 10.70.0 |
| Structured logs | Pino → Vercel log drain | `pino` | 10.3.1 |
| Product analytics | PostHog, autocapture off on `/apply` | `posthog-js` | 1.417.1 |
| Unit tests | Vitest | `vitest` | 4.1.10 |
| End-to-end tests | Playwright | `@playwright/test` | 1.62.1 |
| Scheduled work | Vercel Cron | — | — |
| CI | GitHub Actions | — | — |
| Ops console | This same Next app, `/ops` route group | — | — |

Nothing above is a second deployment. The only new *runtime* dependencies on
another company are Upstash, Resend, Turnstile and Sentry, and each of them has
a working degraded mode if it is down.

---

## 2. Database access — why Drizzle, and the one setting that breaks it

**`drizzle-orm` 0.45.2 + `drizzle-kit` 0.31.10 + `postgres` 3.4.9.**

Against Prisma: Prisma ships a query engine and a generated client, which is
weight on a serverless cold start, and its migration story wants its own
opinions about the database. Drizzle is a thin typed layer over SQL that
compiles away, and `drizzle-kit generate` writes plain `.sql` files into the
repo — which is exactly what `README.md` §7 demands ("migrations live in the
repo, so the schema is reproducible rather than being whatever someone clicked
into a dashboard").

Against writing raw SQL with `postgres.js` alone: the data model in §5 of
`README.md` is five joined tables that the ops console will query in a dozen
shapes. Hand-written SQL there is fine right up until someone renames a column.

`drizzle-zod` derives Zod schemas from the table definitions. The project
already validates with Zod 4 (`lib/application/schema.ts`), so the applicant
form and the database agree on what a passport number is by construction rather
than by two people remembering.

### The setting that will cost you an afternoon

Supabase gives you two connection strings. On Vercel you want the **Supavisor
transaction-mode pooler on port 6543**, not the direct connection on 5432 —
serverless opens and abandons connections faster than Postgres can retire them,
and a direct connection exhausts the pool under mild load.

Transaction pooling does not support prepared statements. `postgres.js` uses
them by default, so this is not optional:

```ts
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
```

Migrations still run against the **direct** URL (5432), because DDL needs a
session. Two variables, two purposes: `DATABASE_URL` and `DIRECT_URL`.

---

## 3. Security

This is the section that matters most, because the product's whole content is
passport scans, faces, and card payments. Ordered by what an attacker reaches
first.

### 3.1 Bot protection on the send-code action — Cloudflare Turnstile

Every OTP send costs roughly ₹0.15 and consumes the number's hourly allowance.
An unprotected `sendCode` action is a script away from being a way to burn the
client's SMS balance and to get the DLT header flagged for abuse — which is
slow and painful to unwind.

Turnstile is free at any volume we will see, needs no SDK (server-side
verification is one `fetch` to `challenges.cloudflare.com/turnstile/v0/siteverify`),
and unlike a captcha it is usually invisible to a real person. It goes in front
of `sendCode` and `resend`, not in front of `verify` — verification is already
attempt-capped and adding friction there punishes the honest user.

### 3.2 Rate limiting — Postgres first, Upstash for the edge

The `AuthStore` interface already puts per-number send counts in the database
(`countSendsSince`), and once that is Postgres the limiter is correct and shared
across instances. That is the important one, and it needs no new vendor.

**Upstash Redis** (`@upstash/ratelimit` 2.0.8) covers the layer Postgres cannot
reach cheaply: per-IP limits inside `proxy.ts`, which runs at the edge before a
database connection exists. Sliding-window, HTTP-based so it works from edge
runtime, free tier is 500k commands/month which is far past our traffic. If it
is unreachable, fail **open** for browsing routes and **closed** for `sendCode`.

### 3.3 Passport numbers and dates of birth — application-level encryption

Supabase encrypts its disks. That protects against someone stealing a drive and
protects against nothing else — a leaked service-role key, a SQL injection, a
misconfigured RLS policy, or a support engineer with console access all read
plaintext.

So: **AES-256-GCM in the application**, Node's built-in `crypto`, on
`passport_number` and `dob` in the `travellers` table, before the value ever
reaches the driver. A dedicated `DATA_ENCRYPTION_KEY`, separate from
`AUTH_SECRET` — rotating your session secret should not be a decision about
whether historical passport numbers stay readable. Store `key_version` in the
row so rotation is re-encryption at leisure rather than a big-bang migration.

The cost is honest and should be stated up front: an encrypted column cannot be
indexed or searched. Ops search on passport number, if it is ever needed, has to
go through a blind index (HMAC of the normalised value in a second column) — add
that when someone actually asks for it, not now.

### 3.4 Documents — never through a function, never with a public URL

Passport scans go to **Supabase Storage**, private bucket, RLS keyed to
`user_id` so the database enforces isolation instead of us remembering a `WHERE`
clause on every read.

Two rules:

1. **The browser uploads directly** to a signed upload URL the server issues.
   Never proxy the bytes through a Route Handler — Vercel caps request bodies
   around 4.5 MB and a phone camera passport scan will exceed it, and you pay
   for the function time either way.
2. **Reads are short-lived signed URLs** (60 seconds), generated per view. A
   public bucket URL is a passport scan on the open internet the moment it is
   pasted into a support ticket.

**`sharp` 0.35.3** normalises on the way in: re-encode, cap dimensions, and
**strip EXIF**. Phone photographs carry GPS coordinates. A passport scan that
also reports the applicant's home address is a data leak we would have created
ourselves.

Virus scanning is a real gap and I am flagging it rather than solving it: an ops
person will open these files on a Windows machine. Before the ops console ships,
either run uploads through a scanning API or restrict the console to rendering
images in a sandboxed viewer and never downloading. Decide it deliberately.

### 3.5 Server actions — next-safe-action

Next 16 checks the origin on server actions, which stops CSRF. It does not stop
the thing that actually goes wrong: an action that forgets to call `requireUser()`,
or trusts its own arguments. `next-safe-action` 8.6.0 makes both structural —
every action declares a Zod input schema and composes an auth middleware, so
"unauthenticated action" becomes a type error rather than a code review catch.
It fits the project as it stands (Zod 4, react-hook-form, `@hookform/resolvers`
all installed).

### 3.6 The rest of the security surface

- **Env validation** — `@t3-oss/env-nextjs` 0.13.11. `AUTH_SECRET` missing
  should fail the build, not surface as a broken login at 2 a.m. The `.env.example`
  discipline is already there; this enforces it.
- **Security headers** in `next.config.ts`: CSP (nonce-based; GSAP and
  framer-motion both need checking against it — budget an hour), HSTS with
  preload, `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  strict-origin-when-cross-origin`, a restrictive `Permissions-Policy` that
  leaves `camera=(self)` alone because the capture flow needs it.
- **Cookies**: `__Host-` prefix, `httpOnly`, `secure`, `sameSite=lax`. The
  session cookie already carries only a user id — keep it that way.
- **Session revocation**: add `token_version` to `users` and put it in the JWT;
  `dal.ts` compares. Without it "sign out everywhere" and "we think this account
  is compromised" have no implementation.
- **`audit_log` table**, append-only: who looked at which application, when,
  from where. This is not a nice-to-have — DPDP breach notification requires
  answering "whose data, and when", and Sentry cannot answer it.
- **Dependencies**: Renovate or Dependabot, plus `npm audit` in CI.
- **A penetration test before launch.** The product holds passports. Budget it.

---

## 4. Email — the gap `README.md` did not name

There is currently no way for the system to tell an applicant anything. That
blocks: application received, document rejected, appointment booked, decision
in, payment receipt, and the DPDP data-rights acknowledgement.

**Resend 6.20.0 + React Email 1.0.12.** Templates are React components living in
the repo next to the app that sends them, which means they are reviewed and
version-controlled like everything else rather than being edited in a vendor's
WYSIWYG. AWS SES is cheaper per thousand and worth revisiting at volume, but at
launch scale the difference is a rounding error against the engineering time.

Set up **SPF, DKIM and DMARC** on the client's domain on day one. Transactional
mail from a new domain without them lands in spam, and "the applicant never got
the email" is indistinguishable from "the application vanished".

**WhatsApp is phase two, but plan for it.** Indian applicants check WhatsApp and
not email. MSG91 sells WhatsApp Business API alongside the SMS account we are
already opening, so it is a template registration rather than a new vendor.

---

## 5. Payments and invoicing

Razorpay was settled. What still needs deciding:

- Server SDK `razorpay` 2.9.8 for order creation.
- **Webhook in a Route Handler, with signature verification against the raw
  body.** Read the body as text before parsing — any middleware that parses JSON
  first invalidates the HMAC. Reject unverified payloads silently.
- **Never trust the browser's success callback.** The payment is real when the
  webhook says so. The client-side handler updates the UI; the webhook updates
  the database.
- **Idempotency**: store `razorpay_payment_id` with a unique constraint.
  Webhooks retry, and a double-credited application is a support call.
- **GST invoice**: `@react-pdf/renderer` 4.6.1, generated on payment capture,
  stored in Storage, emailed as a link. The invoice *format* — GSTIN, HSN/SAC
  code for visa facilitation services, place of supply — needs the client's CA
  to sign off. That is not an engineering decision and it should not be made by
  guessing.
- `lib/pricingConfig.ts` still says `status: "provisional"`. It must read
  `"verified"` before a payment button exists. Taking money against a placeholder
  fee is the one bug on this list with legal consequences.

---

## 6. The ops console

`README.md` §8 calls this the most-forgotten piece, and it is. Someone at Abizon
has to look at an application, read the passport scan, mark it submitted, and
enter a decision. Today there is nowhere to do that, and `lib/application/status.ts`
correctly refuses to report any status past `ready` because nothing can observe
one.

**Build it inside this Next app**, as an `/ops` route group with its own layout,
deployed as part of the same project.

Against Retool or similar: it would mean passport scans and applicant PII
flowing through a third party's servers, which is a DPDP question the client
would have to answer, plus per-seat pricing forever.

What it needs:

- `staff_users` and `roles` tables, entirely separate from `users`. A staff
  account is not a customer account with a flag.
- **Staff auth is not phone OTP.** Email plus TOTP or a passkey. Phone OTP is
  right for applicants and too weak for the account that can read every passport
  in the database. (Pick the library at build time — verify its current version
  then rather than trusting a name written here.)
- Every read of an application writes to `audit_log`.
- The application queue, a document viewer, a status transition form, and a
  notes field. Not more, at first.

This is also what makes `status.ts` honest: `submitted` → `received` →
`processing` become observable because a human observed them, which is how visa
processing actually works. There is no consulate API to integrate.

---

## 7. Scheduled work

**Vercel Cron**, hitting Route Handlers guarded by a `CRON_SECRET` header. Jobs:

| Job | Cadence | Why |
|---|---|---|
| Purge consumed and expired `auth_challenges` | hourly | The table grows forever otherwise |
| Expire stale drafts | daily | Mirrors the 30-day rule in `applicationDraft.ts` |
| Retention deletion of closed applications' documents | daily | DPDP §6 — the schedule that must exist |
| Razorpay reconciliation | daily | Catches payments whose webhook was lost |
| Applicant reminders (incomplete application, expiring passport) | daily | Revenue, and genuinely useful |

Move to Inngest or Trigger.dev only when a job needs retries, fan-out or
multi-step state. Right now none does, and adding a workflow engine for five
cron entries is cost without benefit.

---

## 8. Observability and testing

- **Sentry** `@sentry/nextjs` 10.70.0, with `beforeSend` scrubbing: no passport
  numbers, no phone numbers, no OTP codes in breadcrumbs. Sentry's default
  capture is generous and this app's error paths run through personal data.
- **Pino** 10.3.1 for structured server logs, drained from Vercel to wherever the
  client wants them retained.
- **PostHog** 1.417.1 with **autocapture disabled on `/apply` and `/login`** and
  session replay off entirely. Replay on a form where someone types a passport
  number is a data breach with a dashboard.
- **Vitest** 4.1.10 — first job is reinstating the seventeen OTP and login-state
  checks from `README.md` §3 as real tests, using the `memory` SMS driver that
  exists for exactly this purpose. They passed once, from temporary routes that
  were deleted; right now nothing stops a refactor breaking the attempt ceiling
  silently.
- **Playwright** 1.62.1 for the paths where a bug costs money: login, the full
  apply flow, upload, payment against Razorpay's test mode.
- **GitHub Actions**: typecheck, lint, unit, e2e, and a check that the Drizzle
  schema and the migration files agree.

**Staging must be a separate Supabase project.** Preview deployments pointed at
the production database means a test run can delete a real applicant's passport.

---

## 9. Environment variables to add

On top of the four already in `.env.example`:

```
DATABASE_URL                  Supavisor pooler, port 6543, prepare:false
DIRECT_URL                    Direct connection, port 5432, migrations only
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY     Server only. Never in a client component.
DATA_ENCRYPTION_KEY           32 bytes base64. Separate from AUTH_SECRET.
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
TURNSTILE_SITE_KEY            Public
TURNSTILE_SECRET_KEY
RESEND_API_KEY
EMAIL_FROM
RAZORPAY_KEY_ID               Public
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
CRON_SECRET
SENTRY_DSN
NEXT_PUBLIC_POSTHOG_KEY
```

Each gets a comment in `.env.example` explaining what it is for, in the style
already established there. Real values go in the client's password manager.

---

## 10. Rough monthly cost at launch

Verify every figure at signup; these are from memory and pricing moves.

| Service | Approx. |
|---|---|
| Supabase Pro | ~$25 |
| Vercel Pro | ~$20/seat |
| Upstash | free tier |
| Turnstile | free |
| Resend | free to 3k emails, then ~$20 |
| Sentry | free tier, then ~$26 |
| PostHog | free to 1M events |
| MSG91 | ~₹0.15–0.20 per SMS, pay as you go |
| DLT registration | ~₹5,900 + GST, one-off |
| Razorpay | ~2% + GST per transaction |

Call it **₹6–8k/month** in fixed costs before transaction fees, which is not the
constraint on this project.

---

## 11. Build order

Supersedes `README.md` §8 by folding the new pieces in. Steps 1 and 2 unblock
everything else.

1. **Client starts DLT registration today.** Longest pole, entirely paperwork,
   blocks the launch and nothing else.
2. Supabase project in `ap-south-1`. Drizzle wired up. `users` and
   `auth_challenges` tables. `AuthStore` implemented against Postgres. This
   deletes the in-memory landmine in `store.ts`, which is the one thing that
   makes a deploy currently unsafe.
3. Vitest, and the seventeen checks reinstated as real tests.
4. Env validation, security headers, `next-safe-action`, Turnstile on
   `sendCode`, `token_version` revocation. Cheap now, expensive to retrofit.
5. `applications` and `travellers` tables with field encryption. Replace the
   three functions in `applicationDraft.ts` so a draft follows an account
   instead of a browser.
6. Supabase Storage, RLS, direct signed uploads, `sharp` normalisation.
7. Resend and the first four transactional emails.
8. Razorpay: orders, verified webhook, reconciliation job, GST invoice — after
   `pricingConfig.ts` reads `"verified"`.
9. The ops console. Nothing before this point is operable by a human.
10. Cron jobs, Sentry, Pino, audit log.
11. DPDP: retention schedule, erasure mechanism, consent records, breach runbook.
12. Playwright over login, apply, upload, pay. Penetration test.

---

## 12. What we are deliberately not adding

Naming these matters as much as the list above, because each one is a plausible
suggestion someone will make in a meeting.

- **No OCR / MRZ reader.** `lib/application/passport.ts` is explicit that this
  repository has none, and that several marketing pages describe it anyway. If
  the client wants it, it is Google Cloud Vision or AWS Textract plus a
  meaningful accuracy conversation — a project, not a package. Until then, ops
  types the passport details in, and the marketing copy should be corrected.
- **No separate Node/Express API.** Route Handlers and server actions cover
  every case here. Revisit if a mobile app ever needs the same API.
- **No Kubernetes, no Docker, no queue broker.** Vercel plus Postgres serves
  this load with room to spare.
- **No CRM.** The ops console covers it until someone can articulate what a CRM
  would add.
- **No consulate integration**, because none is offered. Status moves when a
  human moves it, and `status.ts` is already built to tell the truth about that.
