/**
 * WHERE EACH DOCUMENT HAS GOT TO
 * ---------------------------------------------------------------------------
 * The applicant's question after they upload is not "what is the status of my
 * application" — the tracking page answers that — it is "has anybody looked at
 * my passport yet". Those are different questions with different answers, and
 * an application sitting at `submitted` can have three documents accepted and
 * one rejected underneath it.
 *
 * This is the model behind that second question. It turns `documents` rows into
 * the three stages the product owner named — uploaded, in process to be
 * verified, verified — plus the fourth that the database has and the list of
 * three does not.
 *
 * ── The fourth stage, and why it cannot be left out ──
 *
 * `document_status` is an enum of three: `pending`, `accepted`, `rejected`. A
 * three-stage bar that ends at "verified" has nowhere to put a rejection, and
 * the options for one are all bad: count it as still in review (the applicant
 * waits for a decision that has been made), count it as verified (a lie), or
 * omit it (the counts stop adding up to the number of documents they uploaded).
 *
 * So `rejected` is a stage of its own, drawn off the line rather than on it —
 * the same treatment `status.ts` gives `withdrawn`, and for the same reason: it
 * is where a document stops, not somewhere every document passes through.
 *
 * ── Why "uploaded" is not a status ──
 *
 * There is no `uploaded` value in the enum, and there should not be. A row in
 * `documents` exists only after `finaliseUpload` has downloaded the bytes,
 * normalised them, stripped the EXIF and written the record — so the row's
 * EXISTENCE is the fact that the upload completed. A separate status would be a
 * second way to say the same thing, and two ways to say one thing is one that
 * can disagree.
 *
 * Everything with a row is therefore at least `uploaded`, which is why the
 * first stage's count is the total.
 */

/*
 * There was a `DocumentReviewStatus` union here — "pending" | "accepted" |
 * "rejected" — with a comment claiming it stopped a fourth being invented. It
 * was referenced by nothing, so it enforced nothing, and the values that reach
 * this module arrive as plain strings off a database row anyway. What actually
 * guards the set is `documentStatus` in `schema.ts` and the `default` branch of
 * `weight` below, which treats a status this file has not been taught as the
 * least advanced rather than as a crash.
 */

export type DocumentProgressStageId = "uploaded" | "checking" | "verified";

export type DocumentProgressStage = {
  id: DocumentProgressStageId;
  label: string;
  /** What reaching this stage means, in the applicant's words. */
  description: string;
};

/**
 * The line, in order.
 *
 * "In review" rather than "In process to be verified", which is what was asked
 * for and is nine words long. The stage sits under a heading that already says
 * these are documents and beside a count; the description carries the rest.
 *
 * ── The descriptions say what REACHING a stage means, not what is happening ──
 *
 * They were written in the present continuous — "Someone at Abizon is checking
 * it" — and that is wrong for a cumulative rail, as a screenshot of the
 * finished state made obvious: a fully verified set reads "5 IN REVIEW /
 * someone at Abizon is checking it" directly under a heading saying every
 * document is verified. The count was right and the sentence contradicted it.
 *
 * A stage description has to hold for every document standing at or past it, so
 * each one names a thing that HAS HAPPENED. Five documents have reached a
 * reviewer whether or not a reviewer is looking at one right now.
 */
export const DOCUMENT_PROGRESS_STAGES: readonly DocumentProgressStage[] = [
  {
    id: "uploaded",
    label: "Uploaded",
    description: "The file reached us and was stored.",
  },
  {
    id: "checking",
    label: "In review",
    description: "Passed to a reviewer at Abizon.",
  },
  {
    id: "verified",
    label: "Verified",
    description: "Checked, accepted, and filed as it is.",
  },
];

export type DocumentProgressInput = {
  kind: string;
  status: string;
  travellerPosition: number;
  rejectionReason: string | null;
  uploadedAt: number;
};

export type DocumentProgressSummary = {
  /** Every document that reached the server. */
  total: number;
  /** Waiting for a reviewer. */
  checking: number;
  /** Accepted. */
  verified: number;
  /** Refused, with a reason. Off the line — see the header. */
  rejected: number;
  /**
   * How far along the line the WHOLE SET is, 0 to 100.
   *
   * Averaged over documents rather than taken from the least advanced one.
   * "One of your five is still in review" is a different message from "your
   * documents are in review", and a bar driven by the minimum shows no
   * movement at all until the last straggler lands — which is the shape that
   * makes a progress bar feel broken.
   *
   * A rejected document contributes its `uploaded` third and no more. It has
   * been looked at, so it is past "uploaded"; it is not verified and is not
   * going to become verified without being replaced, so crediting it for the
   * review stage would let a set of rejections read as nearly finished.
   */
  percent: number;
};

/** How far one document is along the line, as a fraction. */
function weight(status: string): number {
  if (status === "accepted") return 1;
  if (status === "pending") return 2 / 3;
  // `rejected`, and anything the enum grows that this has not been taught.
  return 1 / 3;
}

export function summariseDocuments(
  documents: readonly DocumentProgressInput[],
): DocumentProgressSummary {
  const total = documents.length;

  if (total === 0) {
    return { total: 0, checking: 0, verified: 0, rejected: 0, percent: 0 };
  }

  const checking = documents.filter((d) => d.status === "pending").length;
  const verified = documents.filter((d) => d.status === "accepted").length;
  const rejected = documents.filter((d) => d.status === "rejected").length;

  const percent = Math.round(
    (documents.reduce((sum, d) => sum + weight(d.status), 0) / total) * 100,
  );

  return { total, checking, verified, rejected, percent };
}

/**
 * The count standing at each stage of the line.
 *
 * CUMULATIVE, deliberately. Every document that has been verified was also
 * uploaded, so "Uploaded 5 / In review 2 / Verified 3" describes five files —
 * whereas a partition would read "Uploaded 0", which is true of the enum and
 * false of the applicant's experience, since they uploaded five things.
 */
export function stageCounts(
  summary: DocumentProgressSummary,
): Record<DocumentProgressStageId, number> {
  return {
    uploaded: summary.total,
    checking: summary.checking + summary.verified,
    verified: summary.verified,
  };
}

/**
 * The one sentence to show above the bar.
 *
 * A rejection outranks everything, because it is the only state that needs the
 * applicant to do something, and burying it under "3 of 5 verified" is how it
 * gets missed until a consulate asks.
 */
export function documentHeadline(summary: DocumentProgressSummary): string {
  if (summary.total === 0) return "No documents uploaded yet";

  if (summary.rejected > 0) {
    return summary.rejected === 1
      ? "One document needs replacing"
      : `${summary.rejected} documents need replacing`;
  }

  if (summary.verified === summary.total) {
    return summary.total === 1
      ? "Your document is verified"
      : "All documents verified";
  }

  if (summary.verified === 0) return "Waiting to be checked";

  return `${summary.verified} of ${summary.total} verified`;
}
