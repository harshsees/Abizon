/**
 * `server-only` throws on import to stop a server module ending up in a client
 * bundle. Vitest is neither, so the real package would fail every test that
 * touches a `lib/` module.
 *
 * Aliased in `vitest.config.ts`. The import stays in the source files, where it
 * is doing a real job — this only changes what it resolves to under test.
 */
export {};
