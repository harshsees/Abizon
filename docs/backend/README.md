# Abizon backend — architecture and handover

Written 15 August 2026. This is the document a new engineer, or the client's own
team, should be able to read once and then run the system.

---

## 1. Where things stand

The site is 150-odd destination pages plus a complete application flow — passport
capture, live photograph, multi-step traveller details — that runs **entirely in
the browser**. Nothing is submitted anywhere. `lib/applicationDraft.ts` says so in
its own header: drafts live in `localStorage` and "when a real applications API
exists, replace the three functions below".

Phone login is the first piece of real backend. It is built and working. Everything
else below is the plan around it.

---

## 2. The recommended stack, and why

| Concern | Choice | Why this one |
|---|---|---|
| Database | **Supabase Postgres**, Mumbai (`ap-south-1`) | Relational data (applications → travellers → documents) in an actual relational database. It is plain Postgres, so leaving costs a `pg_dump`, not a rewrite. |
| Auth | **Own implementation** (already built) | See §3. |
| Documents | **Supabase Storage** + row-level security | Passport scans need per-user isolation enforced by the database, not by remembering to write a `WHERE` clause. |
| OTP SMS | **MSG91** | ~₹0.15 per SMS against Twilio's ~₹0.45+, direct carrier connections, and it handles DLT registration in its own console. |
| Payments | **Razorpay** | RBI-licensed aggregator, PCI-DSS Level 1, handles the RBI card-data localisation rule. |
| Hosting | **Vercel** | Already a Next.js app. Nothing here needs anything else. |

### Why not Firebase

Firestore is a document store and this data is relational — an application has
travellers, travellers have documents, documents have statuses, and the ops team
will want to ask "every application waiting on a Schengen appointment this week".
That is a join, and joins are what Firestore is worst at. Firebase phone auth is
genuinely good, but it is the one part we are not outsourcing anyway (§3), so it
buys little and costs Firestore.

### Why not a bare Node/Express service

It is a second deployment, a second set of secrets and a second thing to keep
patched, in exchange for capabilities Route Handlers and Server Actions already
have. Revisit if a non-web client (a mobile app) ever needs the same API.

---

## 3. Why OTP is ours and not the vendor's

Supabase, Firebase and MSG91 all sell "send and verify an OTP for you". We use
none of them, and MSG91 only carries the message.

Verification is where the attempt ceiling, the rate limits, the replay guard and
the session issue all live. Handing that to a vendor means those properties are
whatever the vendor's endpoint enforces this quarter, and it makes the vendor
almost impossible to change later. They carry the message; we own the secret.

The whole implementation is ~200 lines in `lib/auth/`, and its rules are verified.

### What is built

```
src/lib/auth/
  phone.ts        E.164 normalisation. One canonical form, so the rate limiter
                  and the store cannot disagree about what "same number" means.
  otp.ts          The rules: generation, HMAC storage, expiry, attempts, limits.
  session.ts      Signed cookie (jose). Carries a user id and nothing else.
  dal.ts          getCurrentUser / requireUser — the real authorisation check.
  store.ts        Storage behind an interface. In-memory today. ← REPLACE FIRST
  loginState.ts   The login screen's state shape.
  sms/            console | memory | msg91 drivers behind one interface.
src/app/login/page.tsx
src/components/auth/LoginCard.tsx, OtpInput.tsx
src/app/actions/auth.ts
src/proxy.ts      Optimistic route gate (Next 16 renamed middleware → proxy).
```

### The rules, and the verified behaviour

| Rule | Value | Verified |
|---|---|---|
| Code length | 6 digits, CSPRNG | ✅ |
| Stored as | HMAC-SHA256 keyed with `AUTH_SECRET` — never plaintext | ✅ |
| Expiry | 5 minutes | ✅ |
| Wrong guesses | 5, then the challenge dies permanently | ✅ |
| Replay | A used code is refused | ✅ |
| Resend cooldown | 30 seconds | ✅ |
| Sends per number | 5 per hour, across all challenges | ✅ |
| Correct code after cap | Still refused | ✅ |

The login state machine was checked separately, and all eight passed:

| Behaviour | Result |
|---|---|
| Short number rejected before any SMS is sent | ✅ |
| Landline prefix rejected | ✅ |
| `098825 15043` normalises to `+919882515043` and advances | ✅ |
| Wrong code stays on the code step, attempts decrement | ✅ |
| Correct code redirects to the requested destination | ✅ |
| `?next=https://evil.example.com` discarded, falls back to `/profile` | ✅ |
| "Use a different number" returns to the phone step | ✅ |
| Verify against a state with no challenge is inert | ✅ |

All seventeen checks passed against the running app on 15 Aug 2026. They were run
from temporary routes that have since been deleted — **they should be reinstated
as real tests** (`vitest`, using the `memory` SMS driver, which exists for exactly
this) before this goes anywhere near production.

---

## 4. Two things that will bite, in order

### 4.1 DLT registration — start this now, it is the long pole

Under TRAI rules you cannot send a transactional SMS to an Indian number until
three things are registered on the operators' DLT portals:

1. the **business entity** (needs PAN, GST, incorporation certificate — the
   *client's* documents, not yours),
2. the **sender header** — six alphabetic characters, e.g. `ABIZON`,
3. the exact **message template**, variables and all.

Roughly ₹5,900 + GST, one-off, and 1–3 working days per step *if* nothing is
queried. Unregistered traffic is **dropped silently at the carrier** — the API
call returns success and the SMS simply never arrives, which is the worst
possible thing to debug under launch pressure.

Development is not blocked by this: `SMS_PROVIDER=console` prints codes to the
terminal, and the driver seam means switching to MSG91 is one environment
variable. But the paperwork should be moving today.

Also note: the registered template's variables must stay named `OTP` and `EXPIRY`
to match `lib/auth/sms/msg91.ts`, or re-register the template.

### 4.2 The in-memory store must be replaced before any deploy

`lib/auth/store.ts` currently keeps challenges, users and rate-limit counters in
process memory. That is correct on one long-lived Node process and **silently
wrong on serverless**, which is what Vercel is:

- the instance that sent the code is usually not the instance that verifies it,
  so users get "that code has expired" for a code issued nine seconds ago;
- the rate limiter counts per instance, so N instances mean N× the allowance —
  it appears to work in testing and does nothing under load.

It warns on first use and the file says all of this at the top. Replacing it
means implementing the `AuthStore` interface against Postgres; nothing upstream
changes.

---

## 5. Data model to build next

```sql
users            id, phone_e164 (unique), created_at, last_login_at
auth_challenges  id, phone_e164, code_hash, expires_at,
                 attempts_remaining, sends_remaining, last_sent_at, consumed_at
applications     id, user_id, country_slug, status, plan, travel_date,
                 created_at, submitted_at
travellers       id, application_id, full_name, dob, passport_number,
                 passport_expiry, nationality, gender
documents        id, traveller_id, kind, storage_path, uploaded_at
payments         id, application_id, razorpay_order_id, razorpay_payment_id,
                 amount_paise, gst_paise, status, created_at
```

Two notes carried over from the front end:

- `lib/pricingConfig.ts` holds the service fee and GST rate, marked
  `status: "provisional"`. Those numbers still need commercial sign-off; the flag
  exists so the UI can say so rather than quietly presenting a guess as a price.
- Traveller details and documents are deliberately *not* in `localStorage` today
  (see the comment in `applicationDraft.ts`). When they move server-side they land
  in the tables above, encrypted at rest, and that is a DPDP decision as much as a
  technical one.

---

## 6. DPDP Act — what actually applies

India's Digital Personal Data Protection Act: rules notified 13 Nov 2025, and
**full substantive compliance is required by 13 May 2027**. Passport scans and
face photographs are about as sensitive as ordinary personal data gets.

What this means concretely:

- **The client is the Data Fiduciary**, not you. They carry the liability — up to
  ₹250 crore for a breach traced to absent security safeguards. Get that
  allocation in writing in the contract.
- Consent must be specific and stated at collection. The login screen already
  carries a purpose line rather than a bare "by continuing you agree".
- Data-principal rights (access, correction, erasure) need an actual mechanism,
  not a mailbox someone means to check.
- Breach notification is mandatory. That implies logging and monitoring that can
  answer "whose data, and when".
- Retention: passport scans should have a deletion schedule after an application
  closes. Keeping them forever is the default only if nobody decides otherwise.

Not legal advice — the client should have a practitioner confirm scope before the
2027 deadline.

---

## 7. Handing this to the client

The goal is that they can fire you and still run. That means **every account is
created by them, in their name, with you invited** — never the reverse.

| Account | In whose name | Notes |
|---|---|---|
| GitHub | Client org | Repo transferred, you as a collaborator |
| Supabase | Client | Their billing; you as a member |
| MSG91 + DLT | Client, necessarily | Registration needs their PAN/GST |
| Razorpay | Client, necessarily | Needs their PAN/GST/bank account |
| Vercel | Client | Their billing |
| Domain + DNS | Client | The one people forget |

Also part of "done":

- `.env.example` is committed and lists every variable with what it is for. Real
  values go in a shared password manager, never in chat or email.
- Database migrations live in the repo, so the schema is reproducible rather than
  being whatever someone clicked into a dashboard.
- A runbook: rotating `AUTH_SECRET` (signs everyone out, invalidates codes in
  flight — that is correct on suspected leak), reading logs, restoring a backup.
- Written confirmation of who the Data Fiduciary is (§6).

---

## 8. Suggested order of work

1. **Now, in parallel with everything:** client starts DLT registration.
2. Supabase project in `ap-south-1`; `users` + `auth_challenges` tables; implement
   `AuthStore` against Postgres. Deletes the §4.2 landmine.
3. Reinstate the nine OTP checks as `vitest` tests.
4. Applications + travellers tables; replace `applicationDraft.ts`'s three
   functions so drafts sync to an account instead of one browser.
5. Documents into Supabase Storage with RLS and signed URLs.
6. Razorpay: order creation, webhook with signature verification, GST-compliant
   receipts.
7. An internal ops console. Someone at Abizon has to actually process these, and
   right now there is nowhere for them to do it.
8. DPDP: retention schedule, erasure mechanism, breach runbook.

Steps 1 and 2 are the ones that block others. Step 7 is the one most often
forgotten until launch week.
