"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { and, count, eq, gte, isNull } from "drizzle-orm";

import { audit } from "@/lib/audit";
import { requireDb } from "@/lib/db/client";
import { staffLoginAttempts, staffUsers } from "@/lib/db/schema";
import { requireRole, requireStaff } from "@/lib/ops/dal";
import { changeStatus, reviewDocument } from "@/lib/ops/mutations";
import { verifyPassword } from "@/lib/ops/password";
import { createStaffSession, destroyStaffSession } from "@/lib/ops/session";
import { verifyTotp } from "@/lib/ops/totp";
import { checkLimit } from "@/lib/rateLimit";
import { clientIp, ipPrefix } from "@/lib/request";
import { staffAction, userError } from "@/lib/safeAction";
import { documentViewUrl } from "@/lib/storage/documents";

/**
 * THE OPS ACTIONS.
 * ---------------------------------------------------------------------------
 * Every mutation here goes through `requireRole`, which is a database read of
 * the *current* role rather than the one in the eight-hour-old cookie. Demoting
 * somebody has to take effect on their next click, not their next sign-in.
 */

/* -------------------------------------------------------------------------- */
/* Signing in                                                                  */
/* -------------------------------------------------------------------------- */

export type OpsLoginState = { error?: string };

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  totp: z.string().trim(),
});

/**
 * Both factors in one form, not two steps.
 *
 * The applicant login is a two-step machine because the second step cannot
 * begin until an SMS has been accepted for delivery — the server has to decide
 * when to advance. Nothing of the sort applies here: the staff member has both
 * factors in front of them before they start, and splitting it would add a
 * round trip and a state to keep in agreement for no gain.
 *
 * It also means a wrong password and a wrong code are indistinguishable to the
 * caller, which is the correct amount of information to give: a two-step form
 * confirms that the password was right before asking for the code, and that is
 * a password oracle.
 */
export async function opsLoginAction(
  _previous: OpsLoginState,
  formData: FormData,
): Promise<OpsLoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    totp: formData.get("totp"),
  });

  // Deliberately vague. "That email is not registered" tells an attacker which
  // of their guesses is a real staff account.
  const GENERIC = "Those details were not accepted.";

  if (!parsed.success) return { error: GENERIC };

  const headerList = await headers();
  const prefix = ipPrefix(clientIp(headerList));

  const limit = await checkLimit("staffLoginPerIp", prefix ?? "unknown");
  if (!limit.ok) {
    return { error: "Too many attempts. Wait fifteen minutes." };
  }

  const db = requireDb();

  const record = async (succeeded: boolean) => {
    await db.insert(staffLoginAttempts).values({
      email: parsed.data.email,
      succeeded,
      ipPrefix: prefix ?? null,
    });
  };

  const [staff] = await db
    .select()
    .from(staffUsers)
    .where(and(eq(staffUsers.email, parsed.data.email), isNull(staffUsers.disabledAt)))
    .limit(1);

  /**
   * PER-ACCOUNT LOCKOUT, on top of the per-IP limit above. The IP limit is
   * bypassed by an attacker with a botnet; this one is not, because it counts
   * failures against the account regardless of where they came from.
   *
   * Ten in fifteen minutes. It is a lockout window, not a permanent lock — a
   * permanent one is a denial-of-service against the staff member, delivered by
   * anyone who knows their email address.
   */
  if (staff) {
    const [failures] = await db
      .select({ total: count() })
      .from(staffLoginAttempts)
      .where(
        and(
          eq(staffLoginAttempts.email, parsed.data.email),
          eq(staffLoginAttempts.succeeded, false),
          gte(staffLoginAttempts.createdAt, new Date(Date.now() - 15 * 60 * 1000)),
        ),
      );

    if ((failures?.total ?? 0) >= 10) {
      await audit({
        action: "staff.sign_in_failed",
        actorType: "staff",
        actorId: staff.id,
        metadata: { reason: "locked_out" },
      });
      return { error: "This account is temporarily locked. Try again in fifteen minutes." };
    }
  }

  /**
   * The password is verified even when the account does not exist, against a
   * throwaway hash. Otherwise a missing account returns in a millisecond and a
   * real one takes the hundred milliseconds scrypt costs, and the difference is
   * a reliable way to enumerate staff addresses.
   */
  const hash =
    staff?.passwordHash ??
    "scrypt$65536$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

  const passwordOk = await verifyPassword(parsed.data.password, hash);

  if (!staff || !passwordOk) {
    await record(false);
    return { error: GENERIC };
  }

  // An account mid-enrolment has one factor. One factor is not enough to open a
  // passport archive, so it cannot sign in at all until enrolment finishes.
  if (!staff.totpSecretEncrypted || !staff.totpConfirmedAt) {
    await record(false);
    return {
      error:
        "This account has not finished setting up its authenticator. Ask an administrator.",
    };
  }

  let totpOk = false;
  try {
    totpOk = await verifyTotp(staff.totpSecretEncrypted, parsed.data.totp);
  } catch (error) {
    // A secret that will not decrypt is a key-management failure, not a wrong
    // code. Reporting it as "wrong code" would send somebody hunting for the
    // wrong problem for an afternoon.
    console.error("[ops] could not decrypt a TOTP secret", error);
    return { error: "Sign-in is unavailable. Contact whoever administers this system." };
  }

  if (!totpOk) {
    await record(false);
    return { error: GENERIC };
  }

  await record(true);
  await db
    .update(staffUsers)
    .set({ lastLoginAt: new Date() })
    .where(eq(staffUsers.id, staff.id));

  await createStaffSession({ sub: staff.id, ver: staff.tokenVersion, role: staff.role });

  await audit({
    action: "staff.signed_in",
    actorType: "staff",
    actorId: staff.id,
  });

  redirect("/ops");
}

export async function opsSignOutAction(): Promise<void> {
  const staff = await requireStaff();

  await audit({ action: "staff.signed_out", actorType: "staff", actorId: staff.id });
  await destroyStaffSession();

  redirect("/ops/login");
}

/* -------------------------------------------------------------------------- */
/* Working the queue                                                           */
/* -------------------------------------------------------------------------- */

export const changeStatusAction = staffAction
  .metadata({ name: "ops.changeStatus" })
  .inputSchema(
    z.object({
      applicationId: z.uuid(),
      to: z.enum(["received", "processing", "decided", "closed", "withdrawn"]),
      // Shown to the applicant verbatim on the tracking page and in the email,
      // which the console says above the box. Capped because it is going into
      // an email body.
      note: z.string().trim().max(500).optional(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const staff = await requireRole("processor");

    const result = await changeStatus({ staff, ...parsedInput });
    if (!result.ok) userError(result.error);

    revalidatePath(`/ops/applications/${parsedInput.applicationId}`);
    revalidatePath("/ops");

    return { ok: true };
  });

export const reviewDocumentAction = staffAction
  .metadata({ name: "ops.reviewDocument" })
  .inputSchema(
    z.object({
      documentId: z.uuid(),
      applicationId: z.uuid(),
      decision: z.enum(["accepted", "rejected"]),
      reason: z.string().trim().max(300).optional(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const staff = await requireRole("processor");

    const result = await reviewDocument({
      staff,
      documentId: parsedInput.documentId,
      decision: parsedInput.decision,
      reason: parsedInput.reason,
    });

    if (!result.ok) userError(result.error);

    revalidatePath(`/ops/applications/${parsedInput.applicationId}`);
    return { ok: true };
  });

/**
 * Mints a sixty-second URL for one document and records that it was looked at.
 *
 * WHY THIS IS AN ACTION AND NOT A PROP. The detail page could sign every
 * document's URL while rendering, and then a page open in a tab would hold live
 * links to every passport on the application for as long as it stayed open —
 * and a screenshot of the developer tools would hold them for longer. Signing on
 * demand means one URL exists at a time, for a minute, and the audit log records
 * which document was actually opened rather than which page was loaded.
 */
export const documentUrlAction = staffAction
  .metadata({ name: "ops.documentUrl" })
  .inputSchema(z.object({ documentId: z.uuid(), storagePath: z.string().max(200) }))
  .action(async ({ parsedInput }) => {
    const staff = await requireRole("viewer");

    const url = await documentViewUrl(parsedInput.storagePath);
    if (!url) userError("That document could not be opened.");

    await audit({
      action: "document.viewed",
      actorType: "staff",
      actorId: staff.id,
      subjectType: "document",
      subjectId: parsedInput.documentId,
    });

    return { url };
  });
