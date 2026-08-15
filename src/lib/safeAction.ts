import "server-only";

import { createSafeActionClient, DEFAULT_SERVER_ERROR_MESSAGE } from "next-safe-action";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/dal";
import type { User } from "@/lib/auth/store";
import { getCurrentStaff, type Staff } from "@/lib/ops/dal";

/**
 * THE ACTION CLIENT — making "I forgot the auth check" a type error.
 * ---------------------------------------------------------------------------
 * A Server Action is a POST endpoint with a generated name, reachable by
 * anything that can send the request. The Next.js docs are blunt about it:
 * "Treat every action as an untrusted entry point." The framework checks the
 * Origin header, which handles CSRF, and that is the whole of what it does for
 * you.
 *
 * What actually goes wrong is not CSRF. It is an action, added in a hurry six
 * months from now, that reads `applicationId` from its argument and updates the
 * row — because the form it was written for is only rendered on an
 * authenticated page, and rendering is not a security boundary. That bug is
 * invisible in review: the action looks like every other action.
 *
 * So the shape here makes the check structural. `authedAction` cannot be used
 * without a user in scope, because the middleware supplies it and the handler
 * receives it as `ctx.user`. There is no version of writing one of these that
 * quietly omits the check — omitting it means having no `ctx.user` to pass to
 * the repository, and every repository function requires one.
 *
 * ── Why the login action is not built on this ──
 *
 * `app/actions/auth.ts` keeps its own shape. It is a `useActionState` state
 * machine dispatched on an `intent` field, with one action owning one state, and
 * that structure is load-bearing — the file explains why three separate actions
 * would race. It is also, necessarily, the one action with no user to inject.
 * Retrofitting it here would be a rewrite of working, verified code to satisfy a
 * convention it predates.
 */

/**
 * WHAT LEAVES THE SERVER WHEN SOMETHING THROWS.
 *
 * By default a thrown error's message would be serialised to the client. Ours
 * say things like `relation "travellers" does not exist` and
 * `No key for version 2`, which is a free map of the system for anyone poking
 * at it. So: errors are logged in full server-side and the client is told
 * something generic — unless the error was deliberately written to be shown.
 */
class UserFacingError extends Error {
  readonly userFacing = true;
}

/** Throw this when the message is written *for* the applicant. Anything else
 *  becomes "something went wrong" on the way out. */
export function userError(message: string): never {
  throw new UserFacingError(message);
}

const base = createSafeActionClient({
  handleServerError(error) {
    if (error instanceof UserFacingError) return error.message;

    // Full detail to the server log and the error tracker; nothing but the
    // generic string to the browser.
    console.error("[action] unhandled error", error);
    return DEFAULT_SERVER_ERROR_MESSAGE;
  },

  // Every action declares what it is for. It costs one line and it is what the
  // audit and rate-limit middleware key on, rather than each action remembering
  // to name itself twice.
  defineMetadataSchema() {
    return z.object({ name: z.string() });
  },
});

/**
 * For actions that genuinely have no user — a public lookup, a tracking page.
 * Rare, and the name is deliberately the awkward one so that reaching for it
 * requires a moment's thought.
 */
export const publicAction = base;

export type AuthedContext = { user: User };

/**
 * The default. `ctx.user` is a real, current user: `getCurrentUser` re-reads the
 * row and compares the session's token version, so a revoked session fails here
 * even though its signature is still valid.
 */
export const authedAction = base.use(async ({ next }) => {
  const user = await getCurrentUser();

  if (!user) {
    // Not a redirect. A redirect from an action is a page-level idea, and the
    // caller here is a form on a page that has already rendered — it needs to
    // show a message, not navigate. The route gate in `proxy.ts` is what stops
    // a signed-out visitor reaching the page at all.
    userError("Your session has ended. Sign in again to continue.");
  }

  return next({ ctx: { user } satisfies AuthedContext });
});

export type StaffContext = { staff: Staff };

/**
 * The ops console's equivalent, and a *separate* client rather than a role flag
 * on the one above.
 *
 * A member of staff has no applicant session and should not need one — the two
 * identities live in different tables, behind different cookies, signed with
 * different secrets, precisely so that neither can be mistaken for the other.
 * An ops action built on `authedAction` would demand an applicant session that
 * a staff member does not have, and the natural fix — accepting either — is how
 * "signed in as somebody" turns into "authorised for this".
 *
 * Role checks are separate again and live in the action, via `requireRole`,
 * because `viewer` and `admin` are both legitimately staff and the difference
 * matters per action rather than per client.
 */
export const staffAction = base.use(async ({ next }) => {
  const staff = await getCurrentStaff();

  if (!staff) {
    userError("Your ops session has ended. Sign in again.");
  }

  return next({ ctx: { staff } satisfies StaffContext });
});
