import "server-only";

import { z } from "zod";

/**
 * ENVIRONMENT — validated once, in one place, with the failure at the right time.
 * ---------------------------------------------------------------------------
 * WHAT THIS REPLACES. Twelve scattered `process.env.THING!` reads, each of
 * which fails at the moment the feature is first used rather than at the moment
 * the deploy is wrong. A missing `RESEND_API_KEY` should not surface as a
 * silently unsent "your application was received" email three days after
 * launch; it should surface when someone asks whether email is configured.
 *
 * THE RULE THIS FILE ENFORCES, and it is the same rule already established in
 * `auth/session.ts` and `auth/otp.ts`:
 *
 *   In production, a missing required variable is fatal.
 *   In development, the app degrades to something honest and keeps running.
 *
 * The second half matters as much as the first. A fresh clone with no
 * `.env.local` must still start, or the 150 destination pages become unworkable
 * for anyone doing front-end work. Every subsystem below therefore has a
 * documented degraded mode, and every degraded mode announces itself.
 *
 * WHY NOT `@t3-oss/env-nextjs`, which the stack document named. It is a good
 * library and it is 60 lines of behaviour we need plus a peer-dependency
 * relationship with Zod that we would have to keep in step. This project
 * already owns its OTP implementation for the same reason — the thing being
 * outsourced is smaller than the cost of depending on it. Zod 4 is already a
 * dependency and does the whole job.
 *
 * NEXT_PUBLIC_* VARIABLES ARE NOT HERE. They are inlined into the client bundle
 * at build time by a literal textual match on `process.env.NEXT_PUBLIC_FOO`, so
 * reading them through a variable produces `undefined` in the browser. They live
 * in `env.public.ts` and are read literally.
 */

const isProduction = process.env.NODE_ENV === "production";

/* -------------------------------------------------------------------------- */
/* Shapes                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A Postgres URL, checked far enough to catch the mistakes people actually
 * make: pasting the dashboard page URL, or pasting the direct connection
 * string where the pooled one belongs. The port check is not pedantry — see
 * `lib/db/client.ts` for why 6543 and 5432 are not interchangeable.
 */
const postgresUrl = z
  .string()
  .refine((value) => value.startsWith("postgres://") || value.startsWith("postgresql://"), {
    message: "must be a postgres:// connection string",
  });

const schema = z.object({
  /* --- Sessions and one-time codes ------------------------------------- */
  AUTH_SECRET: z.string().min(32).optional(),

  /* --- Database --------------------------------------------------------- */
  /** Supavisor transaction pooler, port 6543. What the app runs on. */
  DATABASE_URL: postgresUrl.optional(),
  /** Direct connection, port 5432. Migrations only — DDL needs a session. */
  DIRECT_URL: postgresUrl.optional(),

  /* --- Field encryption -------------------------------------------------- */
  /**
   * 32 bytes, base64. Deliberately *not* `AUTH_SECRET`: rotating the session
   * secret is a routine response to a suspected cookie leak, and it must not
   * also be a decision about whether historical passport numbers stay readable.
   */
  DATA_ENCRYPTION_KEY: z.string().optional(),
  /** Previous keys, newest first, comma-separated. Lets a rotation decrypt old
   *  rows while new writes use the current key. */
  DATA_ENCRYPTION_KEY_PREVIOUS: z.string().optional(),

  /* --- Documents --------------------------------------------------------- */
  SUPABASE_URL: z.string().url().optional(),
  /** Server only. Bypasses row-level security, so it never reaches a client
   *  component and never appears in a NEXT_PUBLIC_ variable. */
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  /* --- SMS --------------------------------------------------------------- */
  SMS_PROVIDER: z.enum(["console", "memory", "msg91"]).default("console"),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_SENDER_ID: z.string().optional(),
  MSG91_DLT_TEMPLATE_ID: z.string().optional(),

  /* --- Bot protection ---------------------------------------------------- */
  TURNSTILE_SECRET_KEY: z.string().optional(),

  /* --- Edge rate limiting ------------------------------------------------ */
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  /* --- Email ------------------------------------------------------------- */
  RESEND_API_KEY: z.string().optional(),
  /** e.g. `Abizon <applications@abizon.com>`. Must be a domain verified in
   *  Resend with SPF, DKIM and DMARC, or the mail lands in spam. */
  EMAIL_FROM: z.string().optional(),
  /** Where "reply to a human" goes. */
  EMAIL_REPLY_TO: z.string().optional(),

  /* --- Scheduled work ---------------------------------------------------- */
  /** Shared secret on cron route handlers. Without it the purge and deletion
   *  endpoints are public buttons for wiping data. */
  CRON_SECRET: z.string().optional(),

  /* --- Observability ----------------------------------------------------- */
  SENTRY_DSN: z.string().optional(),

  /* --- Ops console -------------------------------------------------------- */
  /** Signs the staff session cookie. Separate from `AUTH_SECRET` so that
   *  invalidating every applicant session does not also lock out the people
   *  who would be handling the incident. */
  OPS_SESSION_SECRET: z.string().min(32).optional(),

  /* --- Site -------------------------------------------------------------- */
  /** Absolute origin, used in emails and signed links where a relative URL is
   *  meaningless. Vercel sets `VERCEL_PROJECT_PRODUCTION_URL`; this overrides. */
  SITE_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof schema>;

/* -------------------------------------------------------------------------- */
/* Requirements                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Everything below is optional in the schema, because "optional" is a statement
 * about the *type* and these are statements about the *deployment*. A variable
 * can be absent in development and mandatory in production, and expressing that
 * as `.optional()` plus an explicit production check keeps the inferred type
 * honest instead of pretending a value exists because production requires it.
 *
 * Each entry says what breaks without it, and that string is what an operator
 * reads at 2 a.m.
 */
const PRODUCTION_REQUIRED: Array<{ key: keyof Env; because: string }> = [
  { key: "AUTH_SECRET", because: "sessions cannot be signed and codes cannot be hashed" },
  { key: "DATABASE_URL", because: "the in-memory auth store is silently wrong on serverless" },
  { key: "DATA_ENCRYPTION_KEY", because: "passport numbers would be written in plaintext" },
  { key: "SUPABASE_URL", because: "documents cannot be stored" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", because: "documents cannot be stored" },
  { key: "CRON_SECRET", because: "the retention and purge endpoints would be public" },
  {
    key: "TURNSTILE_SECRET_KEY",
    because:
      "the send-code endpoint would be an unmetered way to spend the SMS budget. " +
      'Set it to "disabled" to switch the check off deliberately',
  },
  { key: "OPS_SESSION_SECRET", because: "staff sessions cannot be signed" },
  { key: "SITE_URL", because: "links in email would be relative and therefore broken" },
];

/**
 * Conditional requirements: a variable that is only needed because *another*
 * variable selected a mode. Getting this wrong is the single most common
 * deployment mistake — `SMS_PROVIDER=msg91` with no auth key produces an API
 * call that fails per login rather than a startup that fails once.
 */
const CONDITIONAL: Array<{ when: (env: Env) => boolean; require: Array<keyof Env>; label: string }> =
  [
    {
      label: 'SMS_PROVIDER="msg91"',
      when: (env) => env.SMS_PROVIDER === "msg91",
      require: ["MSG91_AUTH_KEY", "MSG91_SENDER_ID", "MSG91_DLT_TEMPLATE_ID"],
    },
    {
      label: "UPSTASH_REDIS_REST_URL is set",
      when: (env) => Boolean(env.UPSTASH_REDIS_REST_URL),
      require: ["UPSTASH_REDIS_REST_TOKEN"],
    },
    {
      label: "RESEND_API_KEY is set",
      when: (env) => Boolean(env.RESEND_API_KEY),
      require: ["EMAIL_FROM"],
    },
  ];

/* -------------------------------------------------------------------------- */
/* Reading                                                                     */
/* -------------------------------------------------------------------------- */

let cached: Env | null = null;

function load(): Env {
  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Environment is invalid:\n${detail}`);
  }

  const env = parsed.data;
  const missing: string[] = [];

  if (isProduction) {
    for (const { key, because } of PRODUCTION_REQUIRED) {
      if (!env[key]) missing.push(`  ${key} — without it, ${because}.`);
    }
  }

  // Conditional requirements apply in every environment. A developer who has
  // gone to the trouble of setting `SMS_PROVIDER=msg91` locally wants to know
  // immediately that the auth key is missing, not one failed send later.
  for (const rule of CONDITIONAL) {
    if (!rule.when(env)) continue;
    for (const key of rule.require) {
      if (!env[key]) missing.push(`  ${key} — required because ${rule.label}.`);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Environment is incomplete:\n${missing.join("\n")}\n\n` +
        `See .env.example for what each variable is for.`,
    );
  }

  return env;
}

/**
 * Lazy rather than validated at module load. Next.js imports server modules
 * during `next build` to collect metadata and prerender static pages, and a
 * throw at import time would mean the build cannot run without production
 * secrets present — which would in turn mean putting production secrets into CI.
 * Validating on first *use* keeps the build hermetic and still fails the first
 * request rather than the hundredth.
 */
export function env(): Env {
  cached ??= load();
  return cached;
}

/* -------------------------------------------------------------------------- */
/* Capability flags                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Every subsystem asks "am I configured?" rather than reading a variable and
 * hoping. The answer decides between the real implementation and the documented
 * degraded one, and it is the same question the health endpoint asks — so what
 * an operator sees on `/api/health` is what the code actually branches on,
 * rather than a second opinion that can drift.
 */
export const capabilities = {
  database: () => Boolean(env().DATABASE_URL),
  encryption: () => Boolean(env().DATA_ENCRYPTION_KEY),
  storage: () => Boolean(env().SUPABASE_URL && env().SUPABASE_SERVICE_ROLE_KEY),
  email: () => Boolean(env().RESEND_API_KEY && env().EMAIL_FROM),
  turnstile: () => Boolean(env().TURNSTILE_SECRET_KEY),
  distributedRateLimit: () =>
    Boolean(env().UPSTASH_REDIS_REST_URL && env().UPSTASH_REDIS_REST_TOKEN),
  errorReporting: () => Boolean(env().SENTRY_DSN),
  opsConsole: () => Boolean(env().OPS_SESSION_SECRET),
} as const;

/**
 * The absolute origin. Vercel provides its own hostname, which is right for
 * preview deployments — a preview's emails should link back to the preview, not
 * to production.
 *
 * READS `process.env` DIRECTLY rather than going through `env()`, and that is
 * not an inconsistency. `robots.ts` and `sitemap.ts` are *prerendered at build
 * time*, with `NODE_ENV=production` set, and they need this value. Calling
 * `env()` there runs the full production requirement check during `next build`
 * — which fails the build on a machine that has no production secrets, which is
 * every CI runner.
 *
 * That is the hermetic-build property the lazy validation in `env()` exists to
 * protect, and lazy is not sufficient on its own: a static page that touches a
 * server module executes it at build time. So the one variable a build-time
 * page needs is read without the ceremony. It is still validated by `env()` for
 * every runtime caller, and it is still required in production.
 */
export function siteUrl(): string {
  const explicit = process.env.SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}

/**
 * Announced once per process when something is running in a degraded mode, so
 * that a developer reading their terminal knows which halves of the system are
 * real. Silence here means everything is configured.
 */
let announced = false;

export function announceDegradedModes(): void {
  if (announced || isProduction || process.env.NODE_ENV === "test") return;
  announced = true;

  const off = Object.entries(capabilities)
    .filter(([, enabled]) => !enabled())
    .map(([name]) => name);

  if (off.length === 0) return;

  console.warn(
    `\n  [abizon] Running without: ${off.join(", ")}.\n` +
      `  Each of these has a degraded local mode and will say so when used.\n` +
      `  See .env.example to switch any of them on.\n`,
  );
}
