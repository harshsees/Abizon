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
 * to a terminal. No `DATABASE_URL`, so the in-memory store is used: these tests
 * assert flow, not persistence, and a suite that needs a live Postgres is a
 * suite that stops being run.
 *
 * The one thing that must never be pointed at production is the database. There
 * is no configuration here that could — but it is worth saying, because the
 * usual way this goes wrong is someone copying a `.env` to make a test pass.
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
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      SMS_PROVIDER: "memory",
      AUTH_SECRET: "e2e-secret-that-is-at-least-thirty-two-characters",
    },
  },
});
