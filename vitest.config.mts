import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

/**
 * The suite is Node-only by design. Every test here covers a server module —
 * the OTP rules, encryption, password hashing, rate limits — which is where the
 * consequences of being wrong are measured in passports rather than pixels.
 *
 * Component tests would need jsdom and a different environment, and the parts
 * of the interface worth testing are covered end-to-end by Playwright, driving
 * a real browser against the real flow.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Long enough for scrypt, which is deliberately slow — a hash costs about
    // 100ms and the password tests do several.
    testTimeout: 15_000,
    env: {
      NODE_ENV: "test",
      // Fixed rather than absent, so that a hash or a signature computed in one
      // test is verifiable in the next. Not a secret: it is only ever used here.
      AUTH_SECRET: "test-secret-that-is-at-least-thirty-two-characters-long",
      DATA_ENCRYPTION_KEY: "YWJpem9uLXRlc3QtZW5jcnlwdGlvbi1rZXktMzJieXQ=",
      SMS_PROVIDER: "memory",
    },
  },
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
      // `server-only` throws when imported outside a server component graph, and
      // Vitest is neither. Stubbed rather than removed from the modules under
      // test, because that import is load-bearing in the application.
      "server-only": resolve(import.meta.dirname, "./src/test/server-only-stub.ts"),
    },
  },
});
