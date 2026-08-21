import { defineConfig, devices } from "@playwright/test";

/**
 * END-TO-END.
 * ---------------------------------------------------------------------------
 * Vitest covers the rules — attempt caps, encryption, hashing — against the
 * modules directly. This covers the paths where a bug costs money or loses an
 * applicant, driven through a real browser against a real server, because those
 * failures live in the wiring rather than in any one function.
 *
 * ── The environment is deliberately pinned ──
 *
 * `SMS_PROVIDER=memory` so the code is readable by the test rather than printed
 * to a terminal. `DATABASE_URL` blanked, so the in-memory store is used: these
 * tests assert flow, not persistence, and a suite that needs a live Postgres is
 * a suite that stops being run.
 *
 * The one thing that must never be pointed at production is the database, and
 * for a while this file claimed no configuration here could do that. It was
 * wrong: `next dev` reads `.env.local`, so the suite followed whatever
 * credentials happened to be in it. Every override the tests depend on is now
 * set explicitly in `webServer.env` below rather than assumed to be missing.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,

  // A `test.only` left in a file is a suite that silently stops covering
  // everything else. Fine locally, fatal in CI.
  forbidOnly: Boolean(process.env.CI),

  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",

  use: {
    /**
     * `localhost`, NOT `127.0.0.1`, and this is load-bearing.
     *
     * The Next dev server treats a request whose Host is not an allowed dev
     * origin as cross-origin and answers **403 on every static chunk**. The
     * page still server-renders, so it looks completely fine — and never
     * hydrates. Assertions on rendered text pass; anything that requires
     * JavaScript silently does nothing.
     *
     * That cost an afternoon: a form field accepted typing (the browser
     * updating a plain DOM input) while React's state stayed empty and the
     * Continue button stayed disabled, with no error anywhere. The alternative
     * fix is `allowedDevOrigins` in `next.config.ts`, which would mean loosening
     * production configuration to suit a test runner.
     */
    baseURL: "http://localhost:3100",
    // On the first retry, not on every run — traces are large and only wanted
    // for the failure that is about to be investigated.
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // The apply flow is a phone flow: a camera capture, a six-box code field, a
    // number pad. Testing it only at desktop widths tests the wrong product.
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],

  webServer: {
    /**
     * A development server, and the reason is a guard rather than convenience.
     *
     * The obvious choice is a production build — different caching, different
     * error handling, a minified bundle. It cannot be used here: both test SMS
     * drivers throw when `NODE_ENV=production`, on purpose, so that a
     * misconfigured deploy fails loudly instead of printing one-time codes into
     * an application log or holding every code it has ever sent in a map.
     *
     * The only ways to run these flows against a production build would be to
     * weaken that guard or to add an escape hatch that could itself be set in
     * production by mistake. Neither is worth it: the guard protects real
     * applicants' codes, and what these tests actually assert — which step the
     * server puts on screen, which route the gate bounces — behaves identically
     * either way.
     *
     * `next build` still runs in CI as its own job, so a build failure is
     * caught; it is just not caught here.
     */
    command: "npm run dev -- --port 3100",
    url: "http://localhost:3100",
    /**
     * A fresh server every run, locally as well as in CI.
     *
     * Reusing it is faster and quietly breaks the suite. Two ceilings are held
     * in the dev server's memory — five sends per number per hour, twenty per
     * IP per hour — and neither resets while the process lives. Every local run
     * spends four of the IP allowance, so about the fifth run of an hour starts
     * failing in the two tests that send a code, with an error that reads
     * exactly like a regression in the login flow.
     *
     * Deriving a fresh number per run (see `e2e/auth.spec.ts`) fixes the
     * per-number half and not the per-IP half, because every test comes from
     * localhost. Restarting the process is what actually makes a run
     * independent of the runs before it. It costs about ten seconds, which is
     * cheaper than one bisect for a failure that was never in the code.
     */
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      SMS_PROVIDER: "memory",
      AUTH_SECRET: "e2e-secret-that-is-at-least-thirty-two-characters",

      /**
       * BLANKED, NOT OMITTED — and this is the whole hermetic guarantee.
       *
       * The header above used to say "No `DATABASE_URL`, so the in-memory store
       * is used ... there is no configuration here that could" point the suite
       * at a real database. That was true only while nobody had filled in
       * `.env.local`. `next dev` loads that file, so the day real Supabase
       * credentials landed the suite silently started running against the real
       * project — writing users and auth challenges into it on every run, and
       * failing once a test number hit the per-number OTP ceiling that is now
       * persisted in Postgres rather than reset with the process.
       *
       * Absent from this object is not the same as absent from the process.
       * These override `.env.local` with empty strings, which `lib/env.ts`
       * treats as unset, so the fallbacks the suite is written against are the
       * ones that actually run.
       */
      DATABASE_URL: "",
      DIRECT_URL: "",
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",

      // Same reasoning: the suite asserts the shape of the login flow, not
      // Cloudflare's availability, and the test keys in `.env.local` would make
      // every run depend on a network call to siteverify.
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
      TURNSTILE_SECRET_KEY: "",
    },
  },
});
