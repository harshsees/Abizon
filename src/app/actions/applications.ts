"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  getApplication,
  openApplication,
  saveTravellers,
  submitApplication,
  updateApplication,
  type TravellerInput,
} from "@/lib/applications/repository";
import {
  STORED_DOCUMENT_KINDS,
  type StoredDocumentKind,
} from "@/lib/application/documents";
import { getCurrentUser } from "@/lib/auth/dal";
import { capabilities } from "@/lib/env";
import { checkLimit } from "@/lib/rateLimit";
import { authedAction, publicAction, userError } from "@/lib/safeAction";
import {
  finaliseUpload,
  issueUploadTicket,
} from "@/lib/storage/documents";

/**
 * THE APPLICATION ACTIONS.
 * ---------------------------------------------------------------------------
 * Every one of these takes a *reference* plus the change, never a whole record.
 * The Next.js data-security guidance puts it exactly right: a client
 * legitimately says which item to act on, and does not get to supply the row's
 * contents or its ownership. Schema validation checks the shape of the input; it
 * says nothing about whether a well-formed id belongs to the caller. That check
 * lives in the repository, in the `where` clause, on every query.
 *
 * ── One action does decrypt, and it is worth saying why ──
 *
 * `openApplicationAction` returns the applicant's own passport details so that
 * resuming an application does not mean a family of four re-typing four
 * passports. An earlier draft of this file refused to decrypt for anyone,
 * which was a cleaner property and the wrong trade: the alternative is a
 * "resume" that restores nothing anybody would notice.
 *
 * What bounds it:
 *
 *   - ownership is in the `where` clause, not a comparison afterwards, so the
 *     query cannot return another applicant's row;
 *   - it returns only what that applicant typed, to that applicant;
 *   - staff decryption is a different path entirely (`lib/ops/queries.ts`) and
 *     writes an audit row before returning.
 *
 * The residual risk is that a script running on the page could ask for the
 * details rather than waiting for them to be typed. That is a smaller window
 * than it sounds — the same script could read the form — and the answer to it
 * is the CSP, not a feature nobody can use.
 */

/* -------------------------------------------------------------------------- */
/* Guards                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Without a database, an application cannot be saved anywhere. Saying so is the
 * only honest option: the alternative is an interface that reports "saved" and
 * loses the work, which is precisely the failure mode `applicationDraft.ts` was
 * written to avoid claiming.
 */
function requireBackend() {
  if (!capabilities.database()) {
    userError(
      "Applications cannot be saved on this environment yet. Your details are " +
        "still in this tab — nothing has been lost.",
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Opening and updating                                                        */
/* -------------------------------------------------------------------------- */

/**
 * OPENING IS THE ONE ACTION THAT MAY SAY "NO, AND THAT IS FINE".
 *
 * Every other action here is `authedAction`, which refuses without a session.
 * This one is public and checks for itself, because its answer decides whether
 * the whole flow runs against a server or stays in the tab — and those are both
 * legitimate outcomes:
 *
 *   - a development clone with no `DATABASE_URL`;
 *   - a session that expired while the applicant was filling the form.
 *
 * A thrown error would make the flow look broken in both cases. A returned
 * `{ available: false }` lets the sync layer fall back to exactly the behaviour
 * this flow had before there was a backend, which is a working, honest flow
 * that says nothing is saved.
 *
 * The reason is a discriminated value rather than a parsed error message. A
 * `catch` that matches on English is a `catch` that stops matching the first
 * time somebody rewords a sentence.
 */
export const openApplicationAction = publicAction
  .metadata({ name: "application.open" })
  .inputSchema(
    z.object({
      // Slug rather than free text: it is matched against the catalogue by the
      // page that uses it, and a constrained character set keeps it out of any
      // path or query it later reaches.
      countrySlug: z
        .string()
        .min(2)
        .max(60)
        .regex(/^[a-z0-9-]+$/, "Not a destination we recognise."),
    }),
  )
  .action(async ({ parsedInput }) => {
    if (!capabilities.database()) {
      return { available: false as const, reason: "no-backend" as const };
    }

    const user = await getCurrentUser();
    if (!user) {
      return { available: false as const, reason: "no-account" as const };
    }

    const application = await openApplication(user.id, parsedInput.countrySlug);

    // Opening is also resuming. One draft per country per applicant, so the
    // second visit finds the first — and everything already recorded comes back
    // with it, including which documents are stored. That last part is what
    // fixes the resume the flow used to call "downgraded": document files were
    // never persisted, so a draft that had reached review could not be honoured.
    // Now they are, and it can — on any device, not just the one that started.
    const restored = await getApplication(user.id, application.id);

    return {
      available: true as const,
      applicationId: application.id,
      reference: application.reference,
      status: application.status,
      plan: application.plan,
      travelDate: application.travelDate,
      travelWindow: application.travelWindow,
      step: application.step,
      travellers: restored?.travellers ?? [],
      documents: restored?.documents ?? [],
    };
  });

export const updateApplicationAction = authedAction
  .metadata({ name: "application.update" })
  .inputSchema(
    z.object({
      applicationId: z.uuid(),
      plan: z.number().int().min(0).max(10).nullable().optional(),
      travellerCount: z.number().int().min(1).max(12).optional(),
      // ISO date only. A datetime here would be a timezone bug waiting for
      // somebody east of UTC to file on the last day of the month.
      travelDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable()
        .optional(),
      travelWindow: z.enum(["soon", "later"]).nullable().optional(),
      step: z.string().max(40).nullable().optional(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    requireBackend();

    // The apply flow autosaves as the applicant types. The limit is generous
    // because that is legitimate traffic, and it exists because an autosave
    // loop with a bug is otherwise unbounded writes to a paid database.
    const limit = await checkLimit("applicationWritePerUser", ctx.user.id);
    if (!limit.ok) userError("Too many changes at once. Wait a moment.");

    const { applicationId, ...patch } = parsedInput;
    const updated = await updateApplication(ctx.user.id, applicationId, patch);

    if (!updated) {
      userError("That application cannot be edited — it may already have been submitted.");
    }

    return { updatedAt: updated.updatedAt };
  });

/* -------------------------------------------------------------------------- */
/* Travellers                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Mirrors `travellerDetailsSchema` in `lib/application/schema.ts` but is
 * deliberately *looser*, and that is not an oversight.
 *
 * That schema validates a completed traveller — six months of passport
 * validity, a date of birth in the past — because it drives the message under
 * an input. This one validates a *saved draft*, which is by definition
 * half-finished: an applicant who has typed a name and no passport number yet
 * must still have their name saved when they close the tab.
 *
 * The strict rules are enforced where they belong, at submission, by
 * `submitApplication`. Enforcing them here would mean a form that refuses to
 * autosave until it is complete, which is the same as not autosaving.
 */
const travellerSchema = z.object({
  position: z.number().int().min(0).max(11),
  fullName: z.string().trim().max(80).nullable().optional(),
  dateOfBirth: z.string().max(20).nullable().optional(),
  passportNumber: z.string().trim().max(20).nullable().optional(),
  passportExpiry: z.string().max(20).nullable().optional(),
  nationality: z.string().trim().max(60).nullable().optional(),
  gender: z.string().max(20).nullable().optional(),
  email: z.string().trim().max(120).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
});

export const saveTravellersAction = authedAction
  .metadata({ name: "application.saveTravellers" })
  .inputSchema(
    z.object({
      applicationId: z.uuid(),
      travellers: z.array(travellerSchema).min(1).max(12),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    requireBackend();

    if (!capabilities.encryption()) {
      userError(
        "Passport details cannot be stored on this environment — encryption is " +
          "not configured. Nothing has been saved.",
      );
    }

    const limit = await checkLimit("applicationWritePerUser", ctx.user.id);
    if (!limit.ok) userError("Too many changes at once. Wait a moment.");

    // The ids come back because the document upload needs them, and the upload
    // happens one step *before* passport details are entered. See the note in
    // `saveTravellers`.
    const travellerIds = await saveTravellers(
      ctx.user.id,
      parsedInput.applicationId,
      parsedInput.travellers as TravellerInput[],
    );

    return { travellerIds };
  });

/* -------------------------------------------------------------------------- */
/* Documents                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The kinds an upload may name, derived rather than written.
 *
 * This was `z.enum(["passport", "photograph"])`, twice — a fourth copy of a
 * list that also lives in `documents.ts`, in the `document_kind` Postgres enum,
 * and in the sync loop. Adding the PAN card, return ticket and hotel booking
 * meant the client offered five kinds and the server refused three of them,
 * with a validation error the applicant would have read as "your upload
 * failed". Reading the constant means the next kind added is accepted here
 * without anybody having to remember this file exists.
 */
const storedDocumentKind = z.enum(
  STORED_DOCUMENT_KINDS as unknown as [StoredDocumentKind, ...StoredDocumentKind[]],
);

/**
 * Hands back a URL the browser PUTs to directly. See the header of
 * `lib/storage/documents.ts` for why the file does not come through here — the
 * short version is a 4.5MB platform limit and a bill for moving bytes twice.
 */
export const uploadTicketAction = authedAction
  .metadata({ name: "document.ticket" })
  .inputSchema(
    z.object({
      travellerId: z.uuid(),
      kind: storedDocumentKind,
      contentType: z.string().max(80),
      byteSize: z.number().int().positive(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    requireBackend();

    if (!capabilities.storage()) {
      userError("Document upload is not configured on this environment.");
    }

    try {
      return await issueUploadTicket({ userId: ctx.user.id, ...parsedInput });
    } catch (error) {
      // `issueUploadTicket` throws messages written for the applicant — "that
      // file is 22MB", "no such traveller" — so they are passed through rather
      // than flattened into the generic string.
      userError(error instanceof Error ? error.message : "Could not prepare the upload.");
    }
  });

export const finaliseUploadAction = authedAction
  .metadata({ name: "document.finalise" })
  .inputSchema(
    z.object({
      travellerId: z.uuid(),
      kind: storedDocumentKind,
      path: z.string().max(200),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    requireBackend();

    const result = await finaliseUpload({ userId: ctx.user.id, ...parsedInput });
    if (!result.ok) userError(result.error);

    return { documentId: result.documentId };
  });

/* -------------------------------------------------------------------------- */
/* Submitting                                                                  */
/* -------------------------------------------------------------------------- */

export const submitApplicationAction = authedAction
  .metadata({ name: "application.submit" })
  .inputSchema(z.object({ applicationId: z.uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    requireBackend();

    const result = await submitApplication(ctx.user.id, parsedInput.applicationId);
    if (!result.ok) userError(result.error);

    // The profile lists applications by status, and the one that just moved is
    // the reason the applicant is looking at it.
    revalidatePath("/profile");

    return { reference: result.reference };
  });
