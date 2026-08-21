import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ENVIRONMENT VALIDATION.
 * ---------------------------------------------------------------------------
 * One rule, and it is the rule that broke the login form: a variable present
 * with an empty value is absent, not invalid.
 *
 * `.env.example` instructs the reader to copy the file and fill in what they
 * need. Doing exactly that leaves twenty-odd lines reading `THING=`, and Zod's
 * `.optional()` says nothing about `""` — so `DATABASE_URL=` failed the
 * `postgres://` refinement, `load()` threw on it, and every caller of `env()`
 * went down together. The first of those on the send-code path is
 * `verifyTurnstile`, so the symptom was a 500 on every sign-in attempt, in the
 * configuration the documentation had just recommended.
 *
 * `env()` caches after the first successful read and `load()` reads
 * `process.env` at call time, so each test re-imports the module rather than
 * sharing one. That is also what makes it safe to assert on the throwing
 * behaviour without poisoning the next test.
 */

const ORIGINAL = { ...process.env };

/** Fresh module registry per case, so `cached` starts null every time. */
async function loadEnvModule() {
  vi.resetModules();
  return import("./env");
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("a blank variable is an absent one", () => {
  it("accepts an environment copied from .env.example with nothing filled in", async () => {
    // Every URL-shaped optional, present and empty. Before the fix this threw
    // on the first of them.
    process.env.DATABASE_URL = "";
    process.env.DIRECT_URL = "";
    process.env.SUPABASE_URL = "";
    process.env.UPSTASH_REDIS_REST_URL = "";
    process.env.SITE_URL = "";

    const { env } = await loadEnvModule();

    expect(() => env()).not.toThrow();
    expect(env().DATABASE_URL).toBeUndefined();
    expect(env().SUPABASE_URL).toBeUndefined();
  });

  it("treats whitespace as blank, because a trailing space is invisible", async () => {
    // This one is worse than an empty value: `"  "` would satisfy a bare string
    // check and then fail at connection time, a long way from the cause.
    process.env.SUPABASE_SERVICE_ROLE_KEY = "   ";

    const { env } = await loadEnvModule();

    expect(env().SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });

  it("reports the capability as off rather than misconfigured", async () => {
    process.env.DATABASE_URL = "";
    process.env.UPSTASH_REDIS_REST_URL = "";
    process.env.UPSTASH_REDIS_REST_TOKEN = "";

    const { capabilities } = await loadEnvModule();

    // The distinction matters: "off" takes the documented degraded path, while
    // a throw takes down the request.
    expect(capabilities.database()).toBe(false);
    expect(capabilities.distributedRateLimit()).toBe(false);
  });

  it("falls back to the default when an enum is left blank", async () => {
    // `SMS_PROVIDER=` with nothing after it is the same copied-example case, and
    // an empty string is not a member of the enum.
    process.env.SMS_PROVIDER = "";

    const { env } = await loadEnvModule();

    expect(env().SMS_PROVIDER).toBe("console");
  });
});

describe("a value that is present is still validated", () => {
  it("rejects a Supabase dashboard URL pasted in as a connection string", async () => {
    // The mistake this check exists for. Blank must not be an excuse to stop
    // catching a wrong value that is genuinely there.
    process.env.DATABASE_URL = "https://supabase.com/dashboard/project/abcd";

    const { env } = await loadEnvModule();

    expect(() => env()).toThrow(/postgres:\/\//);
  });

  it("names every invalid variable at once, not just the first", async () => {
    process.env.DATABASE_URL = "not-a-connection-string";
    process.env.SUPABASE_URL = "not-a-url";

    const { env } = await loadEnvModule();

    // An operator fixing one variable per deploy is the reason this collects.
    expect(() => env()).toThrow(/DATABASE_URL[\s\S]*SUPABASE_URL/);
  });
});

describe("conditional requirements", () => {
  it("refuses SMS_PROVIDER=msg91 with no credentials, in any environment", async () => {
    // The most common deployment mistake: it would otherwise surface as one
    // failed send per login rather than one failure at startup.
    process.env.SMS_PROVIDER = "msg91";
    process.env.MSG91_AUTH_KEY = "";
    process.env.MSG91_SENDER_ID = "";
    process.env.MSG91_DLT_TEMPLATE_ID = "";

    const { env } = await loadEnvModule();

    expect(() => env()).toThrow(/MSG91_AUTH_KEY/);
  });

  it("does not require an email sender when Resend is not configured", async () => {
    process.env.RESEND_API_KEY = "";
    process.env.EMAIL_FROM = "";

    const { env } = await loadEnvModule();

    expect(() => env()).not.toThrow();
  });
});
