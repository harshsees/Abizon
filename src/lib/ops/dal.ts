import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { and, eq, isNull } from "drizzle-orm";

import { requireDb } from "@/lib/db/client";
import { staffUsers } from "@/lib/db/schema";
import { readStaffSession } from "./session";

/**
 * THE OPS DATA ACCESS LAYER.
 * ---------------------------------------------------------------------------
 * The same shape as `lib/auth/dal.ts`, for the same reason: the authorisation
 * check and the identity fetch are one call, so there is no way to find out who
 * the staff member is having skipped the question of whether they may be here.
 *
 * Three things are checked on every request, and each one exists because the
 * signed cookie cannot answer it:
 *
 *   1. the account still exists and is not disabled — a leaver's cookie is
 *      valid for eight hours after their last sign-in, which is eight hours too
 *      long;
 *   2. `tokenVersion` matches — the revocation mechanism, so "sign this person
 *      out now" is a database write rather than a wait;
 *   3. TOTP was confirmed — an account mid-enrolment has one factor, and one
 *      factor is not enough to open a passport archive.
 */

export type Staff = {
  id: string;
  email: string;
  name: string;
  role: "viewer" | "processor" | "admin";
};

export const getCurrentStaff = cache(async (): Promise<Staff | null> => {
  const session = await readStaffSession();
  if (!session) return null;

  const db = requireDb();

  const [row] = await db
    .select()
    .from(staffUsers)
    .where(and(eq(staffUsers.id, session.sub), isNull(staffUsers.disabledAt)))
    .limit(1);

  if (!row) return null;
  if (row.tokenVersion !== session.ver) return null;
  if (!row.totpConfirmedAt) return null;

  // The role comes from the row, never from the token. A role in the cookie is
  // a claim the holder made eight hours ago; demoting somebody has to take
  // effect on their next request, not on their next sign-in.
  return { id: row.id, email: row.email, name: row.name, role: row.role };
});

export const requireStaff = cache(async (): Promise<Staff> => {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/ops/login");
  return staff;
});

/**
 * Role gate. Ordered, because these roles genuinely nest — an admin can do
 * everything a processor can, and a processor everything a viewer can.
 *
 *   viewer      read the queue and an application; cannot change anything
 *   processor   move statuses, accept and reject documents
 *   admin       the above, plus provisioning staff accounts
 *
 * `viewer` exists so that "let them see the queue" does not have to mean
 * "let them mark applications as decided".
 */
const RANK = { viewer: 0, processor: 1, admin: 2 } as const;

export async function requireRole(minimum: keyof typeof RANK): Promise<Staff> {
  const staff = await requireStaff();

  if (RANK[staff.role] < RANK[minimum]) {
    // Not a redirect to the login page — they are signed in, and bouncing them
    // to a login form they will pass again teaches them nothing. This is a
    // refusal and it should read as one.
    redirect("/ops?denied=1");
  }

  return staff;
}
