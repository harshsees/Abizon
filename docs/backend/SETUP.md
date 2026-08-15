# Going live — the eight things no code can do

Written 15 August 2026. Companion to `IMPLEMENTED.md`, which is what was built.

Everything here needs a human with an account, a document, or a decision. None
of it is hard. One item takes days and has to start first, and the rest fit
comfortably into an afternoon.

---

## The order, and why

```
TODAY, in parallel:
  1  DLT registration ....................... days. Blocks launch. Start now.
  2  Supabase project ...................... 20 min → unblocks 6
  4  Turnstile site ......................... 5 min
  5  Generate the secrets ................... 5 min → unblocks 6
  7  Decide the retention period ............ a conversation
  8  Sign off the service fee ............... a conversation

ONCE 2 AND 5 ARE DONE:
  6  First staff account .................... 5 min

BEFORE THE FIRST REAL EMAIL:
  3  SPF, DKIM, DMARC ....................... 30 min + DNS propagation
```

**Only item 1 is urgent**, because it is the only one measured in days and the
only one that cannot be hurried. Everything else can be done the afternoon
before launch. Do it sooner anyway, because item 1 will surface a question about
the business entity that somebody has to go and ask.

---

## 1. DLT registration

**Who:** the client, necessarily. It needs their PAN, their GST certificate and
their incorporation documents. You cannot do this on their behalf.

**Why it matters more than it sounds:** under TRAI rules, an unregistered
transactional SMS to an Indian number is **dropped silently at the carrier**.
The MSG91 API call returns success and the message never arrives. There is no
error to debug. Discovering this during launch week is the worst version of it.

### The three registrations, in order

Each depends on the one before it.

**1a. Entity registration.** On any operator's DLT portal — Jio, Airtel, Vi and
BSNL all run one, and registering on any single portal propagates to the others
through the shared blockchain registry. Jio's (`trueconnect.jio.com`) is the one
most people use.

You will need:
- PAN of the business
- GST certificate
- Certificate of incorporation
- An authorised signatory's details and a letter of authorisation
- ₹5,900 + GST, one-off

Takes 1–3 working days if nothing is queried. Expect one query.

**1b. Header (sender ID) registration.** Six alphabetic characters, no digits:
`ABIZON`. Register it as **Transactional**, not Promotional — OTPs sent on a
promotional header are blocked by DND and roughly a third of Indian numbers have
DND on.

1–2 working days.

**1c. Template registration.** This is the one that bites, because the approved
text must match what the code sends **character for character**.

Register this body, with the variables named exactly `OTP` and `EXPIRY`:

```
{#var#} is your Abizon verification code. It expires in {#var#} minutes.
Do not share it with anyone.
```

Then, in the MSG91 dashboard, map the first `{#var#}` to a variable named `OTP`
and the second to `EXPIRY`. Those names are not arbitrary — `src/lib/auth/sms/msg91.ts`
sends:

```json
{ "mobiles": "919882515043", "OTP": "482913", "EXPIRY": "5" }
```

If you rename a variable during registration, either rename it in that file too
or the carrier drops every message.

Category: **Service Implicit** (transactional). 1–3 working days.

### Then, in MSG91

1. Create the account at `msg91.com` **in the client's name**, not yours.
2. Link the DLT entity ID and the approved header.
3. Copy the auth key from Settings → API.
4. Copy the template ID from the Flow you created.

Set:

```
SMS_PROVIDER=msg91
MSG91_AUTH_KEY=<from the dashboard>
MSG91_SENDER_ID=ABIZON
MSG91_DLT_TEMPLATE_ID=<the flow's id>
```

**Development is not blocked by any of this.** `SMS_PROVIDER=console` prints the
code to the terminal, and switching over is one environment variable.

### How to know it worked

Send one code to a real handset on a real network. Not an emulator, not a
virtual number. If the API returns success and nothing arrives within two
minutes, the template does not match — go back to 1c.

---

## 2. Supabase project

**Region: `ap-south-1` (Mumbai).** Not because of DPDP data-residency rules —
those apply to significant data fiduciaries and probably not to this client —
but because every applicant is in India and 40ms of latency beats 300ms.

### Steps

1. Create the project at `supabase.com`, **in the client's name**, with you
   invited as a member. The handover document is explicit that the goal is that
   they can fire you and still run.
2. Save the database password somewhere permanent at creation. It is shown once.
3. Settings → Database → Connection string. You need **two**:

   | Variable | Which string | Port |
   |---|---|---|
   | `DATABASE_URL` | **Transaction pooler** (Supavisor) | 6543 |
   | `DIRECT_URL` | **Direct connection** | 5432 |

   These are not interchangeable and the failure mode is nasty. See
   `src/lib/db/client.ts` — the app runs on the pooler because serverless
   exhausts a direct connection pool, and migrations run direct because DDL
   needs a session. `prepare: false` is already set for you; do not remove it.

4. Settings → API. Copy the project URL and the **service role** key — not the
   anon key.

```
DATABASE_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

The service role key bypasses row-level security. It is server-only and must
never appear in a `NEXT_PUBLIC_` variable.

### Then run the migrations

```bash
npm run db:migrate
```

Two migrations apply: `0000_initial_schema.sql` creates thirteen tables, and
`0001_storage_buckets.sql` creates the two private storage buckets and their RLS
policies.

Verify with:

```bash
npm run db:studio
```

You should see thirteen tables and, in the Supabase dashboard under Storage, two
buckets named `incoming` and `documents`, both **private**. If either shows as
public, stop and fix it — a public bucket of passport scans is not recoverable,
because the URLs are already out.

---

## 3. SPF, DKIM and DMARC

**Do this before the first real email**, not after. Transactional mail from a
fresh domain without authentication lands in spam, and "the applicant never got
the email" then looks identical to "the application vanished".

### Steps

1. Create the Resend account at `resend.com`, in the client's name.
2. Domains → Add Domain → `abizon.com`.
3. Resend gives you three DNS records. Add them at whoever runs the DNS
   (Cloudflare, GoDaddy, Route 53):

   - **SPF** — a `TXT` record on the sending subdomain, typically
     `v=spf1 include:amazonses.com ~all`. If a `TXT` SPF record already exists on
     that name, **merge** it; two SPF records is the same as none.
   - **DKIM** — a `CNAME` (or `TXT`) record Resend generates. Copy it verbatim,
     including any trailing dot your DNS provider requires.
   - **DMARC** — a `TXT` record at `_dmarc.abizon.com`. Start permissive and
     tighten later:

     ```
     v=DMARC1; p=none; rua=mailto:dmarc@abizon.com
     ```

     `p=none` monitors without rejecting. After two weeks of clean reports, move
     to `p=quarantine`. Going straight to `p=reject` on a domain that also sends
     invoices from somebody's Outlook is how you stop the finance team's email.

4. Wait for Resend to show the domain **Verified**. Usually minutes; DNS can
   take up to 48 hours.
5. Copy the API key.

```
RESEND_API_KEY=re_...
EMAIL_FROM=Abizon <applications@abizon.com>
EMAIL_REPLY_TO=support@abizon.com
```

`EMAIL_FROM` must be on the verified domain. A mismatch is rejected at send.

### How to know it worked

Send yourself one. Open it in Gmail → three dots → **Show original**. You want
`SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`. Anything less and it will eventually
land in spam, just not necessarily today.

Without a key, nothing is dropped — messages print to the terminal and every
attempt is still recorded in the `email_log` table.

---

## 4. Cloudflare Turnstile

Five minutes, free at any volume this site will see.

1. Sign in at `dash.cloudflare.com` — a free account is enough, and the domain
   does **not** need to be on Cloudflare's DNS.
2. Turnstile → Add site.
   - Domains: `abizon.com`, plus `localhost` for development.
   - Widget mode: **Managed**. Invisible to almost every real person.
3. Copy both keys.

```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAA...
TURNSTILE_SECRET_KEY=0x4AAA...
```

The site key is public by design — it goes in the page. The secret key is not.

**Why this is not optional.** The send-code endpoint is a public POST that costs
about ₹0.15 of the client's money per call and consumes one of the five sends
that number is allowed per hour. A script with a list of Indian mobile numbers
empties the SMS balance *and* locks real people out of their own accounts. The
per-number limit does not stop somebody who has a lot of numbers; this does.

To switch it off deliberately rather than by forgetting, set
`TURNSTILE_SECRET_KEY=disabled`. The app refuses to start in production with the
variable simply absent.

---

## 5. Generate the secrets

**Correction to the earlier list: there are five, not three.** `CRON_SECRET` is
required in production and is a generated secret like the others, and
`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` should be set on any multi-instance
deployment. The three named earlier are the three that are *cryptographically
load-bearing*; these two are equally necessary.

```bash
openssl rand -base64 32   # AUTH_SECRET
openssl rand -base64 32   # DATA_ENCRYPTION_KEY
openssl rand -base64 32   # OPS_SESSION_SECRET
openssl rand -base64 32   # CRON_SECRET
openssl rand -base64 32   # NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
```

### Why they are separate, which matters more than it looks

| Secret | What it protects | Why not shared |
|---|---|---|
| `AUTH_SECRET` | applicant sessions, OTP hashes | Rotating it signs every applicant out. That is the right response to a leaked cookie. |
| `OPS_SESSION_SECRET` | staff sessions | If it shared `AUTH_SECRET`, the rotation above would also lock out the people handling the incident. And a forgeable applicant token would become a staff token. |
| `DATA_ENCRYPTION_KEY` | passport numbers, dates of birth, TOTP secrets | Rotating a session secret is routine. It must not also be a decision about whether historical passport numbers stay readable. |
| `CRON_SECRET` | the purge and retention endpoints | Those endpoints delete documents, on predictable URLs. |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | inline action closures | Without a stable value, a multi-instance deploy fails actions mid-submit. |

**`DATA_ENCRYPTION_KEY` must decode to exactly 32 bytes.** `openssl rand -base64 32`
produces that. Verify before you commit to it — a wrong-length key throws on
first use with a message saying so, which is better than the alternative but
still an outage.

### Where they go

Into the client's password manager. Never into chat, email, a ticket, or a
committed file. Then into Vercel → Settings → Environment Variables, marked for
Production. Locally they live in `.env.local`, which is gitignored and must stay
that way.

### If `DATA_ENCRYPTION_KEY` is ever lost

Every passport number and date of birth in the database becomes permanently
unreadable. There is no recovery path and that is by design. Back it up in two
places.

---

## 6. The first staff account

Needs items 2 and 5 done first.

```bash
npm run ops:user create ops@abizon.com "Your Name" admin
```

That prints a QR code, a generated password and the TOTP secret **once**. It
does not store the password.

Scan the QR with Google Authenticator, Authy or 1Password, then:

```bash
npm run ops:user confirm ops@abizon.com 123456
```

using the six digits the app shows. **This second step is not optional.** The
account cannot sign in until TOTP is confirmed, and that is deliberate — skipping
it produces accounts that are locked out on their first real login because the
QR scan silently failed.

Then sign in at `/ops/login` with the email, the password and a fresh code.

Other commands:

```bash
npm run ops:user list                      # who exists, and who has not enrolled
npm run ops:user disable ops@abizon.com    # disables and signs out everywhere
```

### Two notes

**Send the password over the password manager, not email or chat.** It is
printed once and never stored.

**Provisioning is a shell command on purpose.** Creating the account that can
read every passport in the database should require access to the production
environment, not a session somebody left open. There is deliberately no "add
staff" page.

Roles: `viewer` reads the queue and applications; `processor` also moves statuses
and reviews documents; `admin` also provisions. Give people `processor` unless
they need more.

---

## 7. Confirm the retention period

**This is a decision, not a task.** Ninety days after an application closes is a
working default that somebody chose so the code would work, not a number the
client has agreed.

It is here: `src/app/api/cron/retention/route.ts`

```ts
const DOCUMENT_RETENTION_DAYS = 90;
```

After that many days past an application's `closed_at`, its passport scans and
photographs are deleted from storage and the rows marked deleted. The record
that the application existed is kept — the client may need to show a consulate
or a regulator that one was filed. What goes is the identity document.

### What to weigh

- **Too short** and a re-application or a consulate query arrives after the scan
  is gone, and the applicant has to send it again.
- **Too long** and the client is holding a growing archive of identity documents
  with no purpose, which is exactly what a DPDP complaint is about.

Ninety days is defensible. Sixty is defensible. Indefinite is not.

Get the answer in writing from the client, change the constant, and note the
decision and its date somewhere that is not a code comment.

---

## 8. Sign off the service fee

**The one item on this list with legal consequences.**

`src/lib/pricingConfig.ts` currently reads:

```ts
export const ABIZON_TERMS: CommercialTerms = {
  serviceFee: 1499,
  expressSurcharge: 1500,
  gstRate: 0.18,
  status: "provisional",
};
```

Every price surface in the app propagates `status: "provisional"` and says so on
the page, which is why it is safe to have shipped. Taking money against a
placeholder fee would not be.

### The provenance, so whoever signs knows what they are signing

- **`serviceFee: 1499`** — one of three figures that used to be hardcoded in
  three different components. `ApplicationCard` used 499 and 1999, `FeeBreakdown`
  used 1499, so the same page quoted three different service fees depending on
  where you looked. 1499 was kept because it was the one the fee breakdown
  showed, not because anyone priced it.
- **`expressSurcharge: 1500`** — carried verbatim from the old plan selector's
  flat "+1500". Same provenance: what the code did, not what the business decided.
- **`gstRate: 0.18`** — *not* provisional in the same sense. 18% is the statutory
  Indian GST rate for this category. It is set by law, not by Abizon, and needs
  no sign-off.

### What to do

Once the client confirms the two figures:

```ts
export const ABIZON_TERMS: CommercialTerms = {
  serviceFee: 999,        // the agreed number
  expressSurcharge: 1200, // the agreed number
  gstRate: 0.18,
  status: "verified",     // ← this is what removes the labelling
};
```

Nothing else changes. The "provisional" labelling disappears from every surface
on its own, because every surface reads the status from here.

**If a fee is not yet decided, set it to `null`, not to a guess and not to `0`.**
`null` means "unknown" and propagates as an absent total; `0` means "we charge
nothing", which is a different claim and a false one.

Also settle, in the same conversation, **how the client will confirm the GST
treatment with their CA** — HSN/SAC code for visa facilitation, place of supply,
and whether they are charging as agent or principal. That determines the invoice
format, and invoicing arrives with payments.

---

## The finished environment

When all eight are done, Vercel's production environment should have every one
of these. `env.ts` refuses to start in production without the ones marked
required, with a message naming what breaks.

```
AUTH_SECRET                          required
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY   strongly recommended
DATABASE_URL                         required   pooler, 6543
DIRECT_URL                                      direct, 5432
DATA_ENCRYPTION_KEY                  required   32 bytes
SUPABASE_URL                         required
SUPABASE_SERVICE_ROLE_KEY            required   server only
SMS_PROVIDER=msg91
MSG91_AUTH_KEY                       required when SMS_PROVIDER=msg91
MSG91_SENDER_ID                      required when SMS_PROVIDER=msg91
MSG91_DLT_TEMPLATE_ID                required when SMS_PROVIDER=msg91
NEXT_PUBLIC_TURNSTILE_SITE_KEY
TURNSTILE_SECRET_KEY                 required
RESEND_API_KEY
EMAIL_FROM                           required when RESEND_API_KEY is set
EMAIL_REPLY_TO
CRON_SECRET                          required
OPS_SESSION_SECRET                   required
SITE_URL                             required
SENTRY_DSN
NEXT_PUBLIC_SENTRY_DSN
NEXT_PUBLIC_POSTHOG_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

### Check it from outside

```
GET https://abizon.com/api/health
```

Returns which capabilities are configured, read from the same flags the code
branches on — so what it reports is what the application actually does, not a
second opinion that can drift.

```json
{
  "status": "ok",
  "databaseReachable": true,
  "configured": {
    "database": true, "encryption": true, "storage": true,
    "email": true, "botProtection": true,
    "distributedRateLimit": false, "opsConsole": true
  }
}
```

`distributedRateLimit: false` is acceptable at launch — the per-number OTP
ceiling lives in Postgres and does not depend on it. Everything else should read
`true`.

---

## Before you call it live

- [ ] One OTP delivered to a real handset on a real network
- [ ] One application submitted end to end, and visible in `/ops`
- [ ] One document uploaded, opened in the ops console, accepted
- [ ] One status change, and the email it triggers arriving in an inbox
- [ ] `/track/<reference>` showing the right status
- [ ] `curl -i https://abizon.com/api/cron/purge` returns **404** without the
      `CRON_SECRET` header
- [ ] Both storage buckets private
- [ ] `pricingConfig.ts` reads `"verified"`
- [ ] Written confirmation of who the Data Fiduciary is (see `README.md` §6)
- [ ] A penetration test. The product holds passports.
