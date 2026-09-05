import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * THE SCHEMA.
 * ---------------------------------------------------------------------------
 * One file, because the whole model fits on a screen and a half and because the
 * relationships are the interesting part — splitting it per-table would hide
 * exactly what a reader comes here to see.
 *
 * THREE CONVENTIONS, applied everywhere:
 *
 * 1. **Timestamps are `timestamptz`, not epoch milliseconds.** The application
 *    layer speaks in `number` (see `auth/store.ts`), and the adapter converts.
 *    That conversion is worth writing because the alternative is an operations
 *    person running `select created_at from applications` and getting
 *    1755230400000. Storage is for whoever reads it directly, and that is not
 *    always a program.
 *
 * 2. **Nothing is hard-deleted while it might be needed to answer a question.**
 *    Personal data *is* hard-deleted, on a schedule, by the retention job — but
 *    that is a deliberate act with a record, not a stray `DELETE`. Rows carry
 *    `deleted_at` so that "this application was withdrawn" and "this application
 *    never existed" stay distinguishable.
 *
 * 3. **Sensitive fields carry `_encrypted` in the name.** Not decoration: it
 *    means the column holds ciphertext from `lib/crypto/fields.ts` and that
 *    reading it with a plain `select` yields nothing useful. Anyone writing a
 *    query can see which columns need the application layer.
 */

/* -------------------------------------------------------------------------- */
/* Enums                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Mirrors `ApplicationStatusId` in `lib/application/status.ts`. That file draws
 * a hard line between the statuses this system can *observe* and the ones it
 * cannot; the database holds the full lifecycle because the ops console is what
 * makes the later ones observable — a human moves them, and `application_events`
 * records who.
 */
export const applicationStatus = pgEnum("application_status", [
  "draft",
  "ready",
  "submitted",
  "received",
  "processing",
  "decided",
  "closed",
  "withdrawn",
]);

/**
 * WHAT KIND OF DOCUMENT A ROW HOLDS.
 *
 * The first three describe a PERSON — one per traveller, and one traveller's
 * passport is no use for another. The last three describe the TRIP: a PAN card
 * for whoever is paying, the return booking, the hotel reservation. A family of
 * four files four passports and one hotel booking, so the trip documents are
 * written against the lead traveller's row rather than repeated four times.
 * `lib/application/documents.ts` is where that split is defined and explained;
 * this enum only has to be able to name the result.
 *
 * ── Adding a value here is a migration, and it is not reversible ──
 *
 * Postgres has `ALTER TYPE … ADD VALUE` and no `DROP VALUE`. Whatever goes in
 * this list is in the database for good, so a kind that turns out to be wrong
 * is retired by ceasing to write it, not by removing it. See migration 0002.
 */
export const documentKind = pgEnum("document_kind", [
  "passport",
  "photograph",
  "panCard",
  "returnTicket",
  "hotelStay",
]);

/**
 * A document's review state. `pending` is not "not uploaded" — it is "uploaded
 * and nobody has looked at it yet", which is the state an ops queue exists to
 * empty.
 */
export const documentStatus = pgEnum("document_status", [
  "pending",
  "accepted",
  "rejected",
]);

/**
 * WHERE A PAYMENT HAS GOT TO.
 *
 * Razorpay's own vocabulary, narrowed to the states that matter here.
 *
 *   created    an order exists at Razorpay and nobody has paid it. Most orders
 *              die here — a checkout opened and abandoned is the commonest
 *              outcome of any payment screen, and it is not a failure.
 *   authorized the bank approved it and the money is on hold. Razorpay
 *              auto-captures by default, so this is usually momentary; it is
 *              named because an account with auto-capture off will sit here.
 *   captured   the money is ours. THIS IS THE ONLY STATE THAT MEANS PAID.
 *   failed     the bank refused, or the applicant abandoned an attempt that had
 *              already started.
 *   refunded   captured and given back.
 *
 * There is deliberately no `pending`: every one of these is a definite thing
 * that happened, and a status meaning "we are not sure" would be used for all
 * five within a month.
 */
export const paymentStatus = pgEnum("payment_status", [
  "created",
  "authorized",
  "captured",
  "failed",
  "refunded",
]);

export const staffRole = pgEnum("staff_role", ["viewer", "processor", "admin"]);

/** Who did a thing. `system` covers cron jobs and webhooks, which have no human
 *  behind them and must not be attributed to one. */
export const actorType = pgEnum("actor_type", ["applicant", "staff", "system"]);

/* -------------------------------------------------------------------------- */
/* Identity                                                                    */
/* -------------------------------------------------------------------------- */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** E.164, the single canonical form. `lib/auth/phone.ts` is the only thing
     *  allowed to produce one, so the rate limiter and the store cannot
     *  disagree about what "the same number" means. */
    phoneE164: text("phone_e164").notNull(),

    /**
     * Bumped to invalidate every session this user holds. Sessions are stateless
     * signed cookies, which is fast and means there is otherwise no way to say
     * "sign out everywhere" or "we think this account is compromised". The
     * version is in the JWT and compared on every authenticated request.
     */
    tokenVersion: integer("token_version").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }).notNull().defaultNow(),

    /** Set by an erasure request. The row survives so that an application's
     *  history stays coherent; everything identifying is cleared. */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("users_phone_idx").on(table.phoneE164)],
);

/* -------------------------------------------------------------------------- */
/* One-time codes                                                              */
/* -------------------------------------------------------------------------- */

export const authChallenges = pgTable(
  "auth_challenges",
  {
    id: uuid("id").primaryKey(),
    phoneE164: text("phone_e164").notNull(),

    /** HMAC-SHA256 of `${challengeId}:${code}`, keyed with `AUTH_SECRET`. The
     *  code itself is never stored, so a dump of this table is not a list of
     *  working codes — six digits fall to a plain hash in milliseconds, but not
     *  to an HMAC whose key is not in the database. */
    codeHash: text("code_hash").notNull(),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    attemptsRemaining: smallint("attempts_remaining").notNull(),
    sendsRemaining: smallint("sends_remaining").notNull(),
    lastSentAt: timestamp("last_sent_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

    /** Set on successful verification, so a correct code cannot be replayed. */
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
  },
  (table) => [
    index("auth_challenges_phone_idx").on(table.phoneE164),
    // The purge job's query. Without it the sweep is a sequential scan over
    // every code ever issued.
    index("auth_challenges_expires_idx").on(table.expiresAt),
  ],
);

/**
 * WHY THIS EXISTS SEPARATELY from `auth_challenges.last_sent_at`.
 *
 * The hourly limit is per *number*, across all challenges — that is the one
 * that actually protects the SMS budget, because the per-challenge limit is
 * bypassed by starting a new challenge. A resend overwrites `last_sent_at`, so
 * counting sends from the challenges table loses every send but the most recent
 * one and the limiter silently allows more than it claims.
 *
 * Append-only. Purged after 24 hours by the cleanup job, since the widest window
 * anything asks about is an hour.
 */
export const authSends = pgTable(
  "auth_sends",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phoneE164: text("phone_e164").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("auth_sends_phone_time_idx").on(table.phoneE164, table.sentAt)],
);

/* -------------------------------------------------------------------------- */
/* Applications                                                                */
/* -------------------------------------------------------------------------- */

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** Short, human-sayable, unique. Support conversations happen on the phone,
     *  and a UUID cannot be read aloud. */
    reference: text("reference").notNull(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    /** Matches `getCountrySlug()` — the same identifier the apply route takes. */
    countrySlug: text("country_slug").notNull(),

    status: applicationStatus("status").notNull().default("draft"),

    /** Index into the destination's processing options. Stored as the index
     *  rather than the label because the labels are presentation and change. */
    plan: smallint("plan"),

    travellerCount: smallint("traveller_count").notNull().default(1),

    /** Date only. A travel date has no time and no timezone; storing it as a
     *  timestamp invites a day of drift for anyone east of UTC. */
    travelDate: text("travel_date"),
    /** The loose answer, where no exact date was given. */
    travelWindow: text("travel_window"),

    /** Where the applicant had reached, so an abandoned application resumes
     *  rather than restarting. Mirrors `ApplicationStepId`. */
    step: text("step"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("applications_reference_idx").on(table.reference),
    index("applications_user_idx").on(table.userId),
    // The ops queue orders by this. "Everything waiting, oldest first" is the
    // single most-run query in the console.
    index("applications_status_updated_idx").on(table.status, table.updatedAt),
  ],
);

export const travellers = pgTable(
  "travellers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),

    /** Order within the application. The first traveller is the one the contact
     *  details belong to. */
    position: smallint("position").notNull(),

    /**
     * One field, not a given/family pair, because `lib/application/schema.ts`
     * asks for "the full name exactly as printed in the passport" and the
     * passport is the authority. Splitting it here would mean guessing where the
     * split falls, which is a guess that goes wrong for a large share of the
     * world's names and produces a visa application in the wrong name.
     *
     * Not encrypted. Names are in the email greeting, on every ops screen and in
     * every sort order; encrypting them would break all of that to protect a
     * field that an attacker holding the row can mostly infer anyway. The line
     * is drawn at identifiers that survive a breach usefully — see below.
     */
    fullName: text("full_name"),

    /* --- Encrypted. See `lib/crypto/fields.ts`. -------------------------- */

    /** AES-256-GCM. A passport number is a lifetime identifier: unlike a
     *  password it cannot be rotated after a breach. */
    passportNumberEncrypted: text("passport_number_encrypted"),

    /**
     * HMAC of the normalised passport number, so ops can search for one without
     * the plaintext being stored or the column being decryptable in bulk. A
     * blind index leaks equality and nothing else, which is exactly the amount
     * of leakage "find this passport" requires.
     */
    passportNumberIndex: text("passport_number_index"),

    dobEncrypted: text("dob_encrypted"),

    /** Which key version the two ciphertext columns were written with, so a key
     *  rotation is re-encryption at leisure rather than a big-bang migration. */
    keyVersion: smallint("key_version"),

    /* --------------------------------------------------------------------- */

    passportExpiry: text("passport_expiry"),
    nationality: text("nationality"),
    gender: text("gender"),

    /** Contact details, on the lead traveller only. */
    email: text("email"),
    phoneE164: text("phone_e164"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("travellers_application_position_idx").on(table.applicationId, table.position),
    index("travellers_passport_index_idx").on(table.passportNumberIndex),
  ],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    travellerId: uuid("traveller_id")
      .notNull()
      .references(() => travellers.id, { onDelete: "cascade" }),

    kind: documentKind("kind").notNull(),

    /** Path inside the private bucket. Never a URL — a stored URL outlives the
     *  signature in it and becomes either a broken link or, worse, a working
     *  one. URLs are minted per view, with a 60-second life. */
    storagePath: text("storage_path").notNull(),

    contentType: text("content_type").notNull(),
    byteSize: bigint("byte_size", { mode: "number" }).notNull(),

    /** SHA-256 of the stored bytes. Answers "is this the same file we
     *  normalised" without downloading it, and makes a silent corruption
     *  visible. */
    checksum: text("checksum").notNull(),

    /** True once `sharp` has re-encoded it and stripped EXIF. A row where this
     *  is false is raw camera output that may carry GPS coordinates and must
     *  not be shown to anyone. */
    normalised: boolean("normalised").notNull().default(false),

    status: documentStatus("status").notNull().default("pending"),
    rejectionReason: text("rejection_reason"),

    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by"),

    /** Set by the retention job when the object is removed from storage. The
     *  row stays so that "we held a passport scan and deleted it on this date"
     *  remains provable, which is a DPDP requirement and not a nicety. */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("documents_application_idx").on(table.applicationId),
    index("documents_traveller_idx").on(table.travellerId),
  ],
);

/**
 * PAYMENTS.
 *
 * ── The amount is in PAISE, and it is an integer ──
 *
 * Razorpay's API is denominated in the smallest currency unit and so is this
 * column, for a better reason than matching them: money in a floating-point
 * column is money that will one day be out by a hundredth of a rupee, and the
 * hundredth will be discovered during a reconciliation rather than in a test.
 * `bigint` with `mode: "number"` because ₹92,233,720,368 is a long way past any
 * visa fee and JavaScript's safe integer range is not the constraint here.
 *
 * ── The amount is written by the SERVER, from the application ──
 *
 * Never from the client. The action recomputes the total from the destination,
 * the plan and the party size before it creates an order — see
 * `createPaymentOrderAction`. A client-supplied amount is the oldest hole in
 * every checkout ever built, and the reason it keeps being built is that
 * passing the number the UI is already displaying is one line shorter.
 *
 * ── Why the order id is unique and the payment id is not ──
 *
 * One order per attempt at paying an application, and Razorpay guarantees the
 * order id. The payment id arrives later — from the browser handshake, or from
 * the webhook, whichever lands first — so it is nullable, and the unique index
 * is on the order. That is also what makes the webhook idempotent: it looks the
 * row up by order id and writes a status, and a webhook delivered three times
 * writes the same status three times.
 *
 * ── What is NOT stored ──
 *
 * No card number, no last four, no cardholder name, no token. Razorpay Checkout
 * collects card details in its own iframe on its own origin, and none of it
 * reaches this application — which is the property that keeps this codebase out
 * of PCI-DSS scope, and it is a property of not having the data rather than of
 * being careful with it. `signature` is the HMAC we verified, kept so that a
 * disputed payment can be re-verified against the same bytes months later.
 */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    /** Denormalised from the application so a payment can be found by owner
     *  without a join, and so a deleted application still has an auditable
     *  payer. */
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    /** `order_...`, from Razorpay. One per attempt. */
    razorpayOrderId: text("razorpay_order_id").notNull(),
    /** `pay_...`. Absent until somebody actually pays. */
    razorpayPaymentId: text("razorpay_payment_id"),
    /** The HMAC Checkout returned, once verified. Kept for re-verification. */
    signature: text("signature"),

    /** Smallest currency unit. See the header. */
    amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("INR"),

    status: paymentStatus("status").notNull().default("created"),
    /** Razorpay's reason, verbatim, when it refuses. Not shown to the
     *  applicant — their message is written for them — but it is the first
     *  thing anybody looks for when a payment did not work. */
    failureReason: text("failure_reason"),

    /** How they paid: `card`, `upi`, `netbanking`, `wallet`. Reported by
     *  Razorpay, useful for reconciliation, and not personal data. */
    method: text("method"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    /** When the money actually became ours. Null until `captured`. */
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("payments_order_idx").on(table.razorpayOrderId),
    index("payments_application_idx").on(table.applicationId),
    index("payments_user_idx").on(table.userId),
  ],
);

/**
 * Every status change, with who made it. This is what turns
 * `lib/application/status.ts`'s unsupported statuses into supported ones: the
 * system cannot observe a consulate, but it can observe a member of staff
 * saying what the consulate did, and that is a different and honest claim.
 */
export const applicationEvents = pgTable(
  "application_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),

    fromStatus: applicationStatus("from_status"),
    toStatus: applicationStatus("to_status").notNull(),

    actorType: actorType("actor_type").notNull(),
    actorId: uuid("actor_id"),

    /** Shown to the applicant on the tracking page when present. Staff are told
     *  as much in the console, so nobody writes an internal note here. */
    note: text("note"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("application_events_application_idx").on(table.applicationId, table.createdAt)],
);

/* -------------------------------------------------------------------------- */
/* Staff                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Deliberately not a flag on `users`. A member of staff is not a customer with a
 * boolean set: they authenticate differently (§ below), they are provisioned by
 * a person rather than by anyone who owns a phone, and conflating the two makes
 * "can this account read every passport in the database" a question about a
 * column default.
 *
 * WHY NOT PHONE OTP FOR STAFF. Phone OTP is the right trade for an applicant —
 * it is what they can do at 11 p.m. on a train. It is the wrong trade for the
 * account that can open every passport scan we hold, because SIM swap is a real
 * and inexpensive attack and the reward here is a database of identity
 * documents. Staff use a password (scrypt) plus TOTP.
 */
export const staffUsers = pgTable(
  "staff_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: staffRole("role").notNull().default("viewer"),

    /** scrypt, with the salt and parameters encoded in the value. See
     *  `lib/ops/password.ts`. */
    passwordHash: text("password_hash").notNull(),

    /** The TOTP shared secret, encrypted with `DATA_ENCRYPTION_KEY`. Stored
     *  encrypted because a database dump containing plaintext TOTP secrets
     *  reduces two factors to one. */
    totpSecretEncrypted: text("totp_secret_encrypted"),
    /** Null until the staff member has proved they can generate a code from it.
     *  An unconfirmed secret must not be accepted as a factor. */
    totpConfirmedAt: timestamp("totp_confirmed_at", { withTimezone: true }),

    tokenVersion: integer("token_version").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),

    /** Disabled rather than deleted: the audit log references these ids, and an
     *  audit trail pointing at a missing row is not an audit trail. */
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("staff_users_email_idx").on(table.email)],
);

/**
 * Failed staff sign-ins. Two jobs: locking an account after repeated failures,
 * and being able to answer "was this account under attack before the breach" —
 * which is a question that only has an answer if someone wrote the attempts
 * down beforehand.
 */
export const staffLoginAttempts = pgTable(
  "staff_login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    succeeded: boolean("succeeded").notNull(),
    /** Truncated to /24 (IPv4) or /48 (IPv6) before storage — enough to spot a
     *  pattern, less than a precise location for every login. */
    ipPrefix: text("ip_prefix"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("staff_login_attempts_email_time_idx").on(table.email, table.createdAt)],
);

/* -------------------------------------------------------------------------- */
/* Compliance                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * THE ANSWER TO "WHOSE DATA, AND WHEN".
 *
 * DPDP breach notification is mandatory, and it is not satisfiable by an error
 * tracker: Sentry knows that an exception happened, not that a member of staff
 * opened forty passport scans on a Sunday. That question has an answer only if
 * every read of personal data wrote a row here first.
 *
 * Append-only by convention and by the absence of any update path in the code.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    actorType: actorType("actor_type").notNull(),
    actorId: uuid("actor_id"),

    /** Dotted and past tense: `document.viewed`, `application.status_changed`,
     *  `user.erasure_completed`. Past tense because a log records what happened,
     *  not what was attempted. */
    action: text("action").notNull(),

    subjectType: text("subject_type"),
    subjectId: uuid("subject_id"),

    ipPrefix: text("ip_prefix"),
    userAgent: text("user_agent"),

    /** Anything specific to this action. Never personal data — the point of the
     *  log is to survive being read by whoever is investigating, which may be a
     *  regulator. */
    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_log_subject_idx").on(table.subjectType, table.subjectId),
    index("audit_log_actor_idx").on(table.actorType, table.actorId, table.createdAt),
    index("audit_log_created_idx").on(table.createdAt),
  ],
);

/**
 * DPDP requires consent to be specific, informed, and *recorded* — the login
 * screen already carries a purpose line rather than a bare "by continuing you
 * agree", and this is where the fact that a particular person saw a particular
 * version of it is kept. Without the version, a later change to the wording
 * retroactively rewrites what everyone consented to.
 */
export const consentRecords = pgTable(
  "consent_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    purpose: text("purpose").notNull(),
    /** The exact wording shown, by version. */
    noticeVersion: text("notice_version").notNull(),

    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  },
  (table) => [index("consent_records_user_idx").on(table.userId, table.purpose)],
);

/**
 * Data-principal rights need "an actual mechanism, not a mailbox someone means
 * to check". This is the mechanism's state: a request is made, it is worked, it
 * completes, and each of those has a timestamp somebody can be held to.
 */
export const erasureRequests = pgTable(
  "erasure_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    /** `requested` → `scheduled` → `completed`, or `refused` with a reason.
     *  Refusal is legitimate — an application in flight with a consulate cannot
     *  be un-submitted — but it has to be stated and dated. */
    status: text("status").notNull().default("requested"),
    reason: text("reason"),

    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    /** Not immediate. Live applications hold documents a consulate still needs,
     *  so erasure runs after the application closes. */
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("erasure_requests_status_idx").on(table.status, table.scheduledFor)],
);

/**
 * Every message we tried to send. "The applicant says they never got it" is one
 * of the most common support conversations there is, and it is unanswerable
 * without a record of what was sent, when, and what the provider said about it.
 */
export const emailLog = pgTable(
  "email_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** Hashed, not stored. The address is already on the traveller row; a second
     *  copy in a log table is a second copy to leak. The hash is enough to group
     *  "everything sent to this person". */
    recipientHash: text("recipient_hash").notNull(),

    template: text("template").notNull(),
    subject: text("subject").notNull(),

    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    applicationId: uuid("application_id").references(() => applications.id, {
      onDelete: "set null",
    }),

    /** Resend's id, so a delivery question can be taken to their dashboard. */
    providerId: text("provider_id"),
    status: text("status").notNull(),
    error: text("error"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("email_log_recipient_idx").on(table.recipientHash, table.createdAt),
    index("email_log_application_idx").on(table.applicationId),
  ],
);

/* -------------------------------------------------------------------------- */

export type UserRow = typeof users.$inferSelect;
export type ApplicationRow = typeof applications.$inferSelect;
export type TravellerRow = typeof travellers.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type StaffUserRow = typeof staffUsers.$inferSelect;
export type ApplicationEventRow = typeof applicationEvents.$inferSelect;
export type PaymentRow = typeof payments.$inferSelect;
