# Taking abizonvisa.com live

Written 23 September 2026, when the domain was bought and the placeholder
`abizon.com` was removed from the repository.

Everything in the repo now names `abizonvisa.com`: the sender addresses, the S3
CORS origin, the Caddy site block, the canonical URLs and the sitemap. None of
that is worth anything until four things are done **outside** the repo, in four
different dashboards. This is that list, in the order the dependencies force.

`infra/aws/README.md` is the infrastructure build. `SETUP.md` is the account
setup. This is the domain, and it is the last thing between those two and a
working site.

---

## The order, and why it is not arbitrary

```
1. DNS  ──┬─→ 2. TLS certificate (Caddy, automatic)  ─→ site loads
          │
          └─→ 3. Email authentication (Resend)       ─→ email arrives

   4. Turnstile ──→ login works        5. Razorpay ──→ payment works
```

DNS first, because the certificate is issued by proving control of a hostname
that resolves, and email authentication is published *as* DNS records. Turnstile
and Razorpay are independent of both and can be done while DNS propagates — but
each blocks a different half of the application flow, so neither is optional.

---

## 1. DNS: point the domain at the server

**What you need first:** the Elastic IP from step 7 of `infra/aws/README.md`.
Write it down; every record below is that one address. It must be an *Elastic*
IP, not the instance's default public IP — the default one changes when the
instance stops, and the day it changes is the day the site disappears and the
certificate stops renewing.

### Which of the two paths you are on

Find where `abizonvisa.com`'s nameservers point today:

```bash
nslookup -type=NS abizonvisa.com          # Windows, macOS, Linux
dig NS abizonvisa.com +short              # if you have dig
```

- **They name your registrar** (`ns1.godaddy.com`, `dns1.hostinger.com`,
  `ns-cloud-*.googledomains.com` …) → use the registrar's DNS panel, **path A**.
- **They name AWS** (`ns-*.awsdns-*.com`) → the Route 53 hosted zone is already
  authoritative, **path B**.

Either works. Route 53 costs about $0.50/month and is worth it only if you want
DNS in the same console as everything else; the registrar's free DNS serves two
A records perfectly well.

### Path A — keep DNS at the registrar

In the registrar's DNS panel, delete any existing `A`, `AAAA` or `CNAME` record
on `@` or `www` (parked-page records are the usual leftovers), then add exactly
two:

| Type | Name / Host | Value | TTL |
|---|---|---|---|
| `A` | `@` (or blank, or `abizonvisa.com`) | `<elastic-ip>` | 300 |
| `A` | `www` | `<elastic-ip>` | 300 |

Every provider labels the apex differently — `@`, blank, or the domain itself.
All three mean the same record. If the panel refuses `@` for an `A` record you
are in the wrong field; there is no valid `CNAME` at the apex.

TTL 300 (five minutes) for the cutover. Raise it to 3600 once the site is up and
you are not expecting to change anything.

### Path B — DNS in Route 53

Route 53 → Hosted zones → `abizonvisa.com` → Create record, twice: `@` and
`www`, type `A`, value `<elastic-ip>`, TTL 300. Do **not** use an alias record —
aliases point at AWS resources, and an EC2 instance is not one of them.

If the zone was created after the domain was registered elsewhere, the registrar
still has to be told: copy the four `NS` values from the zone's `NS` record into
the registrar's "custom nameservers" field. Until that is done, Route 53 is
authoritative for nobody and nothing you type into it has any effect.

### Check a CAA record is not about to refuse the certificate

```bash
dig CAA abizonvisa.com +short
```

Empty output is the normal answer and means anyone may issue. If something *is*
returned and it does not include `letsencrypt.org`, Caddy's request will be
refused by policy, and the error will not say anything useful about why. Add:

```
0 issue "letsencrypt.org"
```

### Verify before moving on

```bash
nslookup abizonvisa.com
nslookup www.abizonvisa.com
```

Both must answer with the Elastic IP. A stale answer is usually your own
resolver's cache — check against a public one to be sure:

```bash
nslookup abizonvisa.com 8.8.8.8
```

Propagation is minutes on a fresh domain that has never had records before,
because nothing anywhere has cached an old answer.

---

## 2. TLS: nothing to do, and how to tell it worked

Caddy requests the certificate itself on first start (`deploy/Caddyfile`), for
both `abizonvisa.com` and `www.abizonvisa.com`, over HTTP-01 on port 80. It
renews without being asked. There is no certificate to buy, upload or rotate.

Three things have to be true, and all three are already arranged if you followed
`infra/aws/README.md`:

- both names resolve to the instance (step 1 above),
- the security group allows **80 and 443 from anywhere** — port 80 is not
  optional, it is where the ACME challenge is answered,
- `ACME_EMAIL` is set when you bring the stack up; it is the only address that
  will be told if renewal ever starts failing.

```bash
cd /srv/abizon
export SITE_DOMAIN=abizonvisa.com ACME_EMAIL=<your-address>
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f caddy
```

`certificate obtained successfully` in that log is the moment the site is live.
From your own machine:

```bash
curl -I https://abizonvisa.com
curl -I https://www.abizonvisa.com        # expect 301 to the apex
curl -s https://abizonvisa.com/api/health
```

The health check should report `databaseReachable: true` and
`backendReachable: true`. If it answers at all but reports the database as
unreachable, DNS and TLS are fine and the problem is `env/web.env`, not this
document.

**If the certificate does not arrive**, it is almost always one of: DNS not yet
resolving from outside your own network, port 80 closed in the security group,
or a CAA record. Let's Encrypt rate-limits **5 failed validations per account,
per hostname, per hour** — so read the log and fix the cause rather than
restarting Caddy in a loop, or you will lock yourself out of retrying.

The web image also has to have been built with `SITE_URL=https://abizonvisa.com`
(`infra/aws/README.md` §6). That value is baked in at build time: it is what the
canonical tags, `robots.txt` and `sitemap.xml` are made of, so an image built
with the default will serve a perfectly working site that tells Google it lives
on `localhost`. Rebuild and redeploy if you are unsure which image you have.

---

## 3. Email: verify the domain in Resend

Full steps are in `SETUP.md` §3, and they have not changed except that the
domain to add is now `abizonvisa.com`. The short version:

1. resend.com → Domains → Add Domain → `abizonvisa.com`.
2. Resend prints three records. Add all three wherever step 1 above left your
   DNS, exactly as printed:
   - **SPF** `TXT` — if a `TXT` SPF record already exists on that name, merge
     the two into one. Two SPF records validate as none.
   - **DKIM** `CNAME` (or `TXT`) — verbatim, including the trailing dot if your
     provider wants one.
   - **DMARC** `TXT` at `_dmarc.abizonvisa.com`:
     `v=DMARC1; p=none; rua=mailto:dmarc@abizonvisa.com`
3. Wait for **Verified** in the Resend dashboard. Usually minutes.
4. `RESEND_API_KEY`, `EMAIL_FROM=Abizon <applications@abizonvisa.com>` and
   `EMAIL_REPLY_TO=support@abizonvisa.com` into SSM, then into `env/web.env`.

`EMAIL_FROM` must be on the verified domain or the send is rejected outright.

**Receiving is a separate problem.** Resend sends; it does not give you an inbox.
Every address the site publishes — `help@`, `support@`, `privacy@`, `security@`,
`refunds@`, `press@`, `partners@`, `emergency@`, and `grievance@`, which
`lib/legal.ts` publishes as a legal contact — needs somewhere to land, which
means Google Workspace or Zoho Mail and an `MX` record. A published grievance
address that bounces is a compliance problem, not an inconvenience. Until the
mailboxes exist, the honest options are forwarding them all to one address
somebody actually reads, or changing what the site publishes.

Verify by sending yourself one: Gmail → three dots → **Show original** → you
want `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`.

---

## 4. Turnstile: add the domain to the widget

`SETUP.md` §4 has the detail. If the widget already exists, this is one field:

dash.cloudflare.com → Turnstile → your widget → Settings → **Domains** → add
`abizonvisa.com`. Keep `localhost` for development.

There is nothing to add for `www`, because `www` never renders a page — Caddy
redirects it before Next.js sees it.

Get this wrong and the failure is specific and total: the widget renders, the
applicant solves it, and `verifyTurnstile` rejects every token, because the
token was issued for a hostname the widget does not claim. Nobody can log in,
and the message on screen will not say why.

---

## 5. Razorpay: authorised domain and webhook

Payments are gated behind `NEXT_PUBLIC_RAZORPAY_KEY_ID` and
`RAZORPAY_KEY_SECRET` (`capabilities.payments` in `lib/env.ts`), so this only
blocks once payments are switched on — but it is part of the domain move, and
easy to forget until the first live payment fails.

In the Razorpay dashboard:

1. **Checkout / authorised domains** — add `abizonvisa.com`. Checkout is a
   hosted modal loaded from `checkout.razorpay.com`, and it refuses to open on
   an origin the account has not authorised.
2. **Webhooks** → Add webhook:
   - URL `https://abizonvisa.com/api/webhooks/razorpay`
   - Events: `payment.captured`, `payment.authorized`, `payment.failed` — the
     three in `HANDLED` in that route. Subscribing to more is harmless;
     subscribing to fewer means a captured payment never reaches the
     application.
   - Copy the signing secret into `RAZORPAY_WEBHOOK_SECRET`. The route verifies
     every request against it and rejects anything unsigned, so a wrong value
     here reads exactly like an attack in the logs.
3. Do this in **test mode** first, with the test keys, and again in live mode.
   They are separate configurations with separate secrets.

The webhook has to be reachable from the internet, and it is: `/api/` is
disallowed in `robots.txt`, which is a crawler instruction, not a firewall.

---

## The checklist

- [ ] `A` records for `@` and `www` → Elastic IP, both resolving via `8.8.8.8`
- [ ] No CAA record that excludes `letsencrypt.org`
- [ ] Web image built with `SITE_URL=https://abizonvisa.com`
- [ ] `docker compose up -d` with `SITE_DOMAIN` and `ACME_EMAIL` set
- [ ] `https://abizonvisa.com` loads; `www` 301s to it
- [ ] `/api/health` reports `databaseReachable` and `backendReachable`
- [ ] Resend domain **Verified**; a test email passes SPF, DKIM and DMARC
- [ ] Mailboxes exist for every address the site publishes
- [ ] Turnstile widget lists `abizonvisa.com`; a real login completes
- [ ] Razorpay authorised domain and webhook (test mode, then live)
- [ ] `https://abizonvisa.com/robots.txt` names the real host and sitemap
- [ ] `https://abizonvisa.com/sitemap.xml` lists ~185 URLs on the real origin
- [ ] Sitemap submitted in Google Search Console, after verifying the domain
      there with the `TXT` record it gives you

The last three are the SEO half and can wait a day. The rest is what "live"
means.
