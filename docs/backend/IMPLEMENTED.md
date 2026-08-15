# What was built, what was verified, and what is left

Written 15 August 2026, immediately after the build. Companion to `stack.md`,
which is the plan, and `README.md`, which is the architecture.

Payments are out of scope by instruction. Everything else in `stack.md` is here.

---

## 1. Verified

Not "written" — run. These are the commands and their results at the time of
writing.

| Check | Command | Result |
|---|---|---|
| Types | `npm run typecheck` | clean |
| Lint | `npm run lint` | 0 errors, 22 warnings (all pre-existing `<img>` advisories) |
| Unit tests | `npm test` | **80 passed** across 9 files |
| End-to-end | `npm run test:e2e` | **40 passed** — desktop Chrome and Pixel 7 |
| Production build | `npm run build` | succeeds; 152 destination pages still static, `/apply` still static |
| Migrations | `npx drizzle-kit generate` | 13 tables, no pending diff |
| Advisories | `npm audit` | 0 high, 0 critical |

**Not verified, and it cannot be from here:** anything requiring a live
Supabase project. The Postgres store, the storage buckets, the RLS policies and
the migrations have never been run against a real database, because there are no
credentials in this environment. They are written against the schema in this
repository and typecheck against it; the first person with a Supabase project
should run `npm run db:migrate` and work one application end to end before
trusting any of it.

---

## 2. What is in the repository now

### Foundation

- `src/lib/env.ts` — every variable, validated once. Production requirements are
  fatal with a message naming what breaks; development degrades and announces it.
- `src/lib/db/schema.ts` — 13 tables. `src/lib/db/client.ts` — Supavisor pooler
  with `prepare: false`, which is the setting that decides whether production
  works under concurrency.
- `src/lib/db/migrations/` — `0000_initial_schema.sql` generated,
  `0001_storage_buckets.sql` hand-written for the buckets and RLS.

### The landmine, removed

`src/lib/auth/stores/postgres.ts` implements the `AuthStore` interface against
Postgres. `README.md` §4.2 called the in-memory store the thing that "must be
replaced before any deploy" — it now runs only when `DATABASE_URL` is unset,
which `env.ts` makes impossible in production.

### Security

- **Session revocation** — `token_version` on `users`, in the JWT, compared in
  `dal.ts`. "Sign out everywhere" is now a database write rather than a wait.
- **Field encryption** — AES-256-GCM on passport numbers and dates of birth,
  with a key ring, versioned rows, column-bound AAD, and an HMAC blind index so
  ops can still search for a passport.
- **Turnstile** on the send-code action, failing closed.
- **Rate limiting** — Upstash when configured, in-process with a loud warning
  when not, failing open.
- **Security headers** in `next.config.ts`, asserted by an e2e test.
- **`next-safe-action`** for every new action, with a staff client separate from
  the applicant one.
- **Audit log** written before every decryption, not after.

### Product

- Applications, travellers and documents, server-side, with ownership enforced
  in the `where` clause on every query.
- Direct browser-to-Supabase uploads, `sharp` normalisation, EXIF stripped,
  sixty-second signed view URLs.
- Transactional email through Resend, with every attempt recorded.
- **The ops console** — `/ops`, with email + password + TOTP, three roles, a
  queue, a document viewer with no download button, and a transition map that
  makes the statuses in `lib/application/status.ts` observable at last.
- Cron jobs for purging and for DPDP retention and erasure.
- Sentry and PostHog, both scrubbed hard enough to be safe to switch on.

---

## 3. Where this deviated from `stack.md`, and why

Four places. Each was a decision made against something found during the build.

**Next.js was upgraded, 16.2.10 → 16.3.1.** `npm audit` reported a proxy-bypass
advisory in App Router applications — and `proxy.ts` is the route gate for
`/profile` and now `/ops`. Fixing a proxy bypass while building on the proxy was
not optional. Non-breaking; the build and all tests pass on it.

**React Email was dropped.** Every `@react-email/*` package installed marked
deprecated on npm. Shipping a deprecated dependency into the layer that tells
applicants what is happening to their passport is a poor trade for some JSX;
`src/lib/email/templates.ts` is hand-written HTML with a plain-text alternative.

**`@t3-oss/env-nextjs` was not used.** It is 60 lines of behaviour plus a
peer-dependency relationship with Zod to keep in step. Zod 4 is already a
dependency and does the whole job. `src/lib/env.ts` is the result and does more —
capability flags, conditional requirements, degraded-mode announcements.

**CSP is static, not nonce-based.** A nonce forces every page to render
dynamically, because nonces are injected during SSR and a static page has no
request. That would take 150-odd destination pages off the CDN permanently. The
trade is stated in full in `next.config.ts`: what is given up is protection
against an injected *inline* script, on pages with no user-generated content.

---

## 3b. The apply flow, wired

The seven-step form now runs against the server, and the design decision worth
knowing is that **the sync layer asks rather than being told**.

The obvious shape is a server component reading the session and the capability
flags and passing them down as props. It cannot be used: `/apply` is statically
prerendered, and its client subtree reads `localStorage` in the reducer's
initialiser — safe only because `useSearchParams` inside a `<Suspense>` boundary
stops that subtree ever rendering on the server. Reading cookies in the page
would make the route dynamic, the subtree would render server-side with no
draft, and every visit would hydrate into a mismatch.

So `openApplicationAction` is the one public action here, and it answers
`{ available: false, reason }` for both "no account" and "no backend". The mode
falls out of the answer. One round trip, self-correcting when a session expires
mid-form, and `/apply` stays static in the build output.

What that bought:

- **Documents upload as they are attached** — browser straight to Supabase via a
  signed URL, normalised, EXIF stripped. The flow used to say "closing the tab
  discards the files", and for a signed-in applicant that is no longer true.
- **Resume works on another device.** The `restore` reducer case adopts a server
  application, conservatively: with no travellers in the tab it takes the
  server's party whole; with travellers present it fills only empty fields,
  because the applicant may be mid-keystroke and what they typed is newer.
- **A real submit button**, which appears only when it can work — signed in,
  with a backend, with every document confirmed stored. In local mode it is
  absent rather than disabled: a greyed-out Submit implies the button is the
  last missing piece, when in fact there is no account to submit against.
- **Tracking resolves.** `lookupApplicationStatus` was a stub returning
  `{ available: false }`; it is now a query, and the page can finally distinguish
  "we cannot look this up" from "we looked and found nothing".
- **Every status is `supported: true`.** They were false from `submitted` onward
  because nothing could observe them. A named member of staff now records each
  transition, which is weaker than an API and is what the page says.

Three deletions came with it, all of the same kind — interface that claimed
something untrue:

- the profile's **verification QR**: a hand-drawn SVG encoding nothing, under a
  countdown from 45 that reset forever, labelled "expires in N";
- the profile's **hardcoded zeroes** and the "Purchased Applications" tab, in a
  product that cannot take a payment;
- **PDF uploads**, which the client accepted and the server always rejected —
  `sharp` strips EXIF by re-encoding and there is no PDF engine here to do it
  with. Limits now come from one shared module both sides import.

---

## 4. Four bugs found on the way

Both were found by tests written for this work, and both predate it.

**`formatE164` mis-grouped every Indian number.** `/^\+(\d{1,3})(\d+)$/` is
greedy with nothing after it to force a backtrack, so `+919882515043` split as
`919` + `882515043` and the OTP screen rendered `+919 882515043`. That line
exists so an applicant can confirm they typed the right number before waiting for
an SMS; mis-grouped, it invites them to conclude they made a mistake and start
again, which costs another message. `maskE164` had the same fault and disclosed
one more digit than intended. Fixed against the known calling-code list, with
`src/lib/auth/phone.test.ts` covering it.

**`robots.ts` broke the hermetic build.** It called `siteUrl()`, which called
`env()`, which ran the production requirement check during `next build` — so the
build failed on any machine without production secrets, which is every CI
runner. Lazy validation is not sufficient on its own, because a statically
prerendered page executes server code at build time. `siteUrl()` now reads
`process.env` directly, and the reasoning is written where it is.

**The CSP blocked every country flag.** `img-src` listed Unsplash and Wikimedia
and not `flagcdn.com`, which serves the flag on every destination card, the
related-visa strip, the passport index and the application header. It would have
shipped as "the flags stopped loading", days later, in no log. An end-to-end run
reported the violation; there is now a test asserting each image host the site
actually uses, and asserting that the list has not been replaced by a wildcard.

**The e2e suite was testing an unhydrated page.** Playwright used
`http://127.0.0.1:3100`, which the Next dev server treats as a cross-origin dev
request and answers with **403 on every static chunk**. The page still
server-rendered, so assertions on text passed while nothing was interactive —
typing into a form field updated the DOM and never reached React, and a Continue
button stayed disabled with no error anywhere. `localhost` fixes it, and the
reasoning is in `playwright.config.ts` so nobody switches it back.

---

## 5. Deliberately not done

**Payments.** Out of scope by instruction. `lib/pricingConfig.ts` still reads
`status: "provisional"` and must read `"verified"` before any payment button
exists — taking money against a placeholder fee is the one item on this list with
legal consequences.

**Malware scanning on uploads.** Named in `lib/storage/normalise.ts` rather than
solved. `sharp` re-encoding defeats polyglot files and does not defeat everything.
The console renders images in the page and has no download button, which is one
of the two real answers; if a download is ever added, a scanning step stops being
advisable and becomes mandatory.

**WhatsApp notifications.** Phase two. Indian applicants check WhatsApp and not
email, and MSG91 sells the Business API alongside the SMS account already being
opened — so it is a template registration, not a new vendor.

**A penetration test.** The product holds passports. Budget it before launch.

---

## 6. What the client has to do that no code can

In rough order of how long it takes.

1. **DLT registration.** Longest pole, pure paperwork, needs their PAN and GST.
   Unregistered SMS to Indian numbers is dropped silently at the carrier — the
   API call succeeds and the message never arrives.
2. **A Supabase project in `ap-south-1`**, then `npm run db:migrate`.
3. **SPF, DKIM and DMARC** on the sending domain, before the first real email.
4. **A Cloudflare Turnstile site**, which is free and takes about five minutes.
5. **Generate three secrets** — `AUTH_SECRET`, `DATA_ENCRYPTION_KEY`,
   `OPS_SESSION_SECRET` — with `openssl rand -base64 32`, into a password
   manager. They are separate on purpose; see `.env.example`.
6. **Create the first staff account**: `npm run ops:user create <email> "<name>"
   admin`, then `confirm` with a code from the authenticator.
7. **Confirm the retention period.** Ninety days after an application closes is a
   working default, not a decision they have made.
8. **Sign off the service fee**, so `pricingConfig.ts` can read `"verified"`.
