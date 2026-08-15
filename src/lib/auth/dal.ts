import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { readSession } from "./session";
import { authStore, type User } from "./store";

/**
 * THE DATA ACCESS LAYER.
 * ---------------------------------------------------------------------------
 * Every read of "who is signed in" goes through here. The point is that the
 * authorisation check and the data fetch are the same call, so there is no way
 * to fetch a user's data having forgotten to check the session — the check is
 * not something a caller can skip, because there is no other entry point.
 *
 * `proxy.ts` also gates these routes, but that check is optimistic: it reads
 * the cookie and nothing else, because it runs on every request including
 * prefetches. It exists to bounce signed-out visitors quickly. It is not the
 * security boundary. This file is.
 *
 * `cache()` memoises within a single render pass, so a layout and three
 * components asking who the user is produce one store read, not four.
 */

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await readSession();
  if (!session) return null;

  const user = await authStore().getUser(session.sub);

  // A valid signature over a user that no longer exists — deleted account, or
  // a store that was reset in development. Treat as signed out.
  return user ?? null;
});

/**
 * For pages that exist only for signed-in users. Redirects rather than
 * returning null, so the caller can treat the result as always present.
 */
export const requireUser = cache(async (): Promise<User> => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
});
