import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";

import { audit } from "@/lib/audit";
import { requireDb } from "@/lib/db/client";
import {
  applicationEvents,
  applications,
  documents,
  travellers,
} from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send";
import { documentRejected, statusChanged } from "@/lib/email/templates";
import { resolveCountry } from "@/lib/countryCatalogue";
import type { Staff } from "./dal";

/**
 * WHAT THE CONSOLE CHANGES.
 * ---------------------------------------------------------------------------
 * `lib/application/status.ts` draws a line: `draft` and `ready` are computed
 * from the application itself, and everything from `submitted` onward "describe
 * things that happen on a server and at a consulate", which nothing in the
 * codebase could observe. That file is right, and this is what makes the rest
 * observable — not by integrating with a consulate, because there is nothing to
 * integrate with, but by recording that a named member of staff saw it happen.
 *
 * Which is a weaker claim than an API would give, and an honest one. Every
 * status past `submitted` therefore carries an actor in `application_events`,
 * and the tracking page can say who moved it and when.
 */

/**
 * THE ALLOWED TRANSITIONS, as data.
 *
 * Without this, "mark as decided" is a button that writes a string, and an
 * application can go from `submitted` straight to `closed` because somebody
 * clicked the wrong row. The map is also the documentation of what the process
 * actually is, which otherwise exists only in whoever set it up.
 */
const TRANSITIONS: Record<string, readonly string[]> = {
  submitted: ["received", "withdrawn"],
  received: ["processing", "withdrawn"],
  processing: ["decided", "withdrawn"],
  decided: ["closed"],
  closed: [],
  withdrawn: [],
  draft: [],
  ready: [],
};

/** What the applicant is told for each status. Written here rather than in the
 *  template so that one place decides both the transition and the wording of
 *  the message announcing it. */
const NOTICE: Record<string, { headline: string; detail: string } | null> = {
  received: {
    headline: "Your documents have been checked",
    detail:
      "We have reviewed everything you uploaded and your application is now with our processing team.",
  },
  processing: {
    headline: "Your application has been filed",
    detail:
      "Your application is now with the consulate. Processing times vary, and we will write again as soon as there is a decision.",
  },
  decided: {
    headline: "There is a decision on your application",
    detail: "Sign in to see the outcome and what happens next.",
  },
  // No email. The applicant asked for it, so telling them it happened is noise.
  withdrawn: null,
  closed: null,
};

export type TransitionResult = { ok: true } | { ok: false; error: string };

export async function changeStatus(input: {
  staff: Staff;
  applicationId: string;
  to: string;
  note?: string;
}): Promise<TransitionResult> {
  const db = requireDb();

  const [row] = await db
    .select()
    .from(applications)
    .where(and(eq(applications.id, input.applicationId), isNull(applications.deletedAt)))
    .limit(1);

  if (!row) return { ok: false, error: "No such application." };

  const allowed = TRANSITIONS[row.status] ?? [];
  if (!allowed.includes(input.to)) {
    return {
      ok: false,
      error: `An application that is "${row.status}" cannot move to "${input.to}". ${
        allowed.length ? `It can go to: ${allowed.join(", ")}.` : "It is in a final state."
      }`,
    };
  }

  // Rejecting a document and then advancing the application would tell the
  // applicant their documents were checked while one of them is waiting to be
  // replaced. Caught here rather than left to the operator to remember.
  if (input.to === "received") {
    const [pending] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(
        and(
          eq(documents.applicationId, input.applicationId),
          eq(documents.status, "rejected"),
          isNull(documents.deletedAt),
        ),
      )
      .limit(1);

    if (pending) {
      return {
        ok: false,
        error: "A document on this application is rejected. The applicant has to replace it first.",
      };
    }
  }

  const now = new Date();
  const status = input.to as typeof applications.$inferInsert.status;

  await db.transaction(async (tx) => {
    await tx
      .update(applications)
      .set({
        status,
        updatedAt: now,
        ...(input.to === "closed" || input.to === "withdrawn" ? { closedAt: now } : {}),
      })
      .where(eq(applications.id, input.applicationId));

    await tx.insert(applicationEvents).values({
      applicationId: input.applicationId,
      fromStatus: row.status,
      toStatus: status!,
      actorType: "staff",
      actorId: input.staff.id,
      note: input.note?.trim() || null,
    });
  });

  await audit({
    action: "application.status_changed",
    actorType: "staff",
    actorId: input.staff.id,
    subjectType: "application",
    subjectId: input.applicationId,
    metadata: { from: row.status, to: input.to, hadNote: Boolean(input.note?.trim()) },
  });

  const notice = NOTICE[input.to];
  if (notice) {
    await notifyApplicant(input.applicationId, async (contact) =>
      sendEmail(
        contact.email,
        statusChanged({
          name: contact.name,
          reference: row.reference,
          country: resolveCountry(row.countrySlug)?.name ?? row.countrySlug,
          status: input.to,
          headline: notice.headline,
          detail: notice.detail,
          note: input.note?.trim() || null,
        }),
        { template: `status.${input.to}`, applicationId: input.applicationId },
      ),
    );
  }

  return { ok: true };
}

/* -------------------------------------------------------------------------- */

export async function reviewDocument(input: {
  staff: Staff;
  documentId: string;
  decision: "accepted" | "rejected";
  reason?: string;
}): Promise<TransitionResult> {
  const db = requireDb();

  // A rejection without a reason produces a second upload with the same problem
  // and a support call. The email template puts the reason under a "Why:"
  // heading precisely because it is the only part of that message that matters.
  if (input.decision === "rejected" && !input.reason?.trim()) {
    return { ok: false, error: "Say why it was rejected — the applicant is told this verbatim." };
  }

  const [row] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, input.documentId), isNull(documents.deletedAt)))
    .limit(1);

  if (!row) return { ok: false, error: "No such document." };

  await db
    .update(documents)
    .set({
      status: input.decision,
      rejectionReason: input.decision === "rejected" ? input.reason!.trim() : null,
      reviewedAt: new Date(),
      reviewedBy: input.staff.id,
    })
    .where(eq(documents.id, row.id));

  await audit({
    action: "document.reviewed",
    actorType: "staff",
    actorId: input.staff.id,
    subjectType: "document",
    subjectId: row.id,
    metadata: { decision: input.decision, kind: row.kind },
  });

  if (input.decision === "rejected") {
    const [application] = await db
      .select({ reference: applications.reference })
      .from(applications)
      .where(eq(applications.id, row.applicationId))
      .limit(1);

    await notifyApplicant(row.applicationId, async (contact) =>
      sendEmail(
        contact.email,
        documentRejected({
          name: contact.name,
          reference: application?.reference ?? "",
          documentLabel: row.kind === "passport" ? "Passport page" : "Photograph",
          reason: input.reason!.trim(),
        }),
        { template: "document.rejected", applicationId: row.applicationId },
      ),
    );
  }

  return { ok: true };
}

/* -------------------------------------------------------------------------- */

/**
 * Contact details live on the lead traveller, which is the only one the form
 * collects them for. An application with no email is a real state — the flow
 * saves progressively — and it means the applicant hears nothing, which is
 * worth logging rather than silently skipping.
 */
async function notifyApplicant(
  applicationId: string,
  send: (contact: { email: string; name: string }) => Promise<unknown>,
): Promise<void> {
  const db = requireDb();

  const [lead] = await db
    .select({ email: travellers.email, fullName: travellers.fullName })
    .from(travellers)
    .where(eq(travellers.applicationId, applicationId))
    .orderBy(asc(travellers.position))
    .limit(1);

  if (!lead?.email) {
    console.warn(`[ops] application ${applicationId} has no contact email — not notified`);
    return;
  }

  // The first word of a full name is the wrong greeting for a good share of the
  // world's naming conventions, but it is markedly better than "Dear applicant"
  // and it is what the applicant typed. Falls back cleanly when it is absent.
  const name = lead.fullName?.trim().split(/\s+/)[0] ?? "Hello";

  await send({ email: lead.email, name });
}
