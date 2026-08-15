/**
 * PROVISIONING A STAFF ACCOUNT.
 * ---------------------------------------------------------------------------
 *   npx tsx scripts/ops-user.ts create alice@abizon.com "Alice Rao" processor
 *   npx tsx scripts/ops-user.ts disable alice@abizon.com
 *   npx tsx scripts/ops-user.ts list
 *
 * ── Why this is a script and not a page in the console ──
 *
 * The first staff account has to exist before anybody can sign in to create the
 * second, so an "add staff" page cannot be the only way. It could be *a* way,
 * and deliberately is not: creating the account that can read every passport in
 * the database should require shell access to the production environment, not a
 * session that somebody left open.
 *
 * ── The output is a secret and is printed once ──
 *
 * Password and TOTP secret are shown on stdout, and nowhere else, ever. They go
 * to the staff member over something that is not email — a password manager
 * share, or spoken aloud. The password hash and the encrypted TOTP secret are
 * what is stored, and neither can be turned back into what was printed.
 *
 * ── Enrolment is not finished here ──
 *
 * `totp_confirmed_at` stays null. The account cannot sign in until the staff
 * member has proved they can generate a code from the secret, which is what
 * `confirm` below does. Skipping that produces accounts locked out on their
 * first real login because a QR scan silently failed.
 */

import "dotenv/config";

import { and, eq, isNull } from "drizzle-orm";
import QRCode from "qrcode";

import { requireDb } from "../src/lib/db/client";
import { staffUsers } from "../src/lib/db/schema";
import { generatePassword, hashPassword } from "../src/lib/ops/password";
import { beginEnrolment, encryptSecret, verifyTotp } from "../src/lib/ops/totp";

const ROLES = ["viewer", "processor", "admin"] as const;

async function create(email: string, name: string, role: string) {
  if (!ROLES.includes(role as (typeof ROLES)[number])) {
    throw new Error(`Role must be one of: ${ROLES.join(", ")}`);
  }

  const db = requireDb();
  const normalised = email.trim().toLowerCase();

  const password = generatePassword();
  const enrolment = beginEnrolment(normalised);

  await db.insert(staffUsers).values({
    email: normalised,
    name,
    role: role as (typeof ROLES)[number],
    passwordHash: await hashPassword(password),
    totpSecretEncrypted: encryptSecret(enrolment.secret),
    // Left null on purpose. See the header.
    totpConfirmedAt: null,
  });

  console.log(`\nCreated ${normalised} as ${role}.\n`);
  console.log(await QRCode.toString(enrolment.uri, { type: "terminal", small: true }));
  console.log(`  Password:      ${password}`);
  console.log(`  TOTP secret:   ${enrolment.secret}   (if the QR will not scan)\n`);
  console.log("  Send these over a password manager, not email or chat.");
  console.log(`  Then: npx tsx scripts/ops-user.ts confirm ${normalised} <six digits>\n`);
}

/**
 * The second half of enrolment. Takes a code generated from the secret, proving
 * the authenticator is actually set up, and only then marks the factor usable.
 */
async function confirm(email: string, token: string) {
  const db = requireDb();
  const normalised = email.trim().toLowerCase();

  const [staff] = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.email, normalised))
    .limit(1);

  if (!staff) throw new Error(`No staff account for ${normalised}.`);
  if (!staff.totpSecretEncrypted) throw new Error("That account has no TOTP secret.");

  if (!(await verifyTotp(staff.totpSecretEncrypted, token))) {
    throw new Error(
      "That code was not accepted. Check the phone's clock is correct and try the next one.",
    );
  }

  await db
    .update(staffUsers)
    .set({ totpConfirmedAt: new Date() })
    .where(eq(staffUsers.id, staff.id));

  console.log(`\n${normalised} can now sign in.\n`);
}

/**
 * Disabled, never deleted. The audit log references these ids, and an audit
 * trail pointing at a missing row is not an audit trail. Bumping the token
 * version at the same time is what makes it immediate — otherwise their current
 * session keeps working for up to eight hours.
 */
async function disable(email: string) {
  const db = requireDb();
  const normalised = email.trim().toLowerCase();

  const [updated] = await db
    .update(staffUsers)
    .set({ disabledAt: new Date(), tokenVersion: 0 })
    .where(eq(staffUsers.email, normalised))
    .returning({ id: staffUsers.id, tokenVersion: staffUsers.tokenVersion });

  if (!updated) throw new Error(`No staff account for ${normalised}.`);

  // Set to a value that cannot match any live token rather than incremented,
  // because the session carries whatever it was issued with.
  await db
    .update(staffUsers)
    .set({ tokenVersion: updated.tokenVersion + 1 })
    .where(eq(staffUsers.id, updated.id));

  console.log(`\n${normalised} is disabled and signed out everywhere.\n`);
}

async function list() {
  const db = requireDb();

  const rows = await db
    .select()
    .from(staffUsers)
    .where(and(isNull(staffUsers.disabledAt)));

  console.log("");
  for (const row of rows) {
    console.log(
      `  ${row.email.padEnd(32)} ${row.role.padEnd(10)} ` +
        `${row.totpConfirmedAt ? "enrolled" : "NOT ENROLLED"}  ` +
        `last seen ${row.lastLoginAt?.toISOString().slice(0, 10) ?? "never"}`,
    );
  }
  console.log("");
}

/* -------------------------------------------------------------------------- */

const [command, ...args] = process.argv.slice(2);

const run = async () => {
  switch (command) {
    case "create":
      if (args.length < 3) throw new Error('Usage: create <email> "<name>" <role>');
      return create(args[0], args[1], args[2]);
    case "confirm":
      if (args.length < 2) throw new Error("Usage: confirm <email> <six digits>");
      return confirm(args[0], args[1]);
    case "disable":
      if (args.length < 1) throw new Error("Usage: disable <email>");
      return disable(args[0]);
    case "list":
      return list();
    default:
      console.log("Commands: create, confirm, disable, list");
  }
};

run()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(`\n  ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
