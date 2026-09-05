"use client";

/**
 * THE DOCUMENT TRACKING RECORD
 * ---------------------------------------------------------------------------
 * Uploaded → In review → Verified, drawn as a rail, with the documents
 * themselves listed underneath and each one's own state against it.
 *
 * ── Why two levels and not one ──
 *
 * The rail alone answers "how far along are we" and cannot answer "which one".
 * The list alone answers "which one" and buries the shape of the whole set in a
 * column of chips. An applicant with five documents and one rejection needs
 * both, and needs them in that order: the rail says something is wrong, and the
 * list says which.
 *
 * ── The rail is cumulative and the list is not ──
 *
 * This looks inconsistent and is deliberate. A stage on the rail counts every
 * document that has REACHED it, so a fully verified set reads 5 / 5 / 5 —
 * because the applicant did upload five things and a rail reading "Uploaded 0"
 * would be describing the enum rather than their experience. A row in the list
 * describes one document, which is in exactly one state. See `stageCounts`.
 *
 * ── Rejection is drawn off the line ──
 *
 * A rejected document has been looked at and refused, which is neither "in
 * review" nor "verified" and is not on the way to either without the applicant
 * replacing it. It gets its own block above the rail, in the destructive
 * colour, naming the reason the reviewer gave — because the reason is the only
 * part of this screen anybody has to act on.
 */

import { AlertTriangle, Check, Clock, Upload } from "lucide-react";

import {
  DOCUMENT_PROGRESS_STAGES,
  documentHeadline,
  stageCounts,
  summariseDocuments,
  type DocumentProgressInput,
} from "@/lib/application/documentProgress";
import { cn } from "@/lib/utils";

/**
 * The applicant's word for each kind.
 *
 * A `Record<string, string>` with a fallback rather than a `Record<
 * DocumentKind, string>`, for the reason the ops console gives for the same
 * decision: a profile page that throws because the database grew a kind the
 * bundle has not been taught is a profile page down over a label.
 */
const KIND_LABEL: Record<string, string> = {
  passport: "Passport",
  photograph: "Photograph",
  panCard: "PAN card",
  returnTicket: "Return ticket",
  hotelStay: "Hotel booking",
};

const when = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function DocumentTracker({
  documents,
  travellerNames,
}: {
  documents: DocumentProgressInput[];
  /**
   * Names by position, when they are known.
   *
   * Optional, and usually absent: the profile route deliberately does not
   * serialise traveller names into the client bundle for a page that only
   * needs to draw progress. Without them a document is labelled by its
   * position — "Traveller 2" — which is enough to tell two passports apart and
   * is all this screen needs to do.
   */
  travellerNames?: Record<number, string>;
}) {
  const summary = summariseDocuments(documents);

  if (summary.total === 0) {
    return (
      <p className="rounded-2xl bg-surface-sunken px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
        Nothing uploaded yet. Documents you attach appear here with their
        progress as we check them.
      </p>
    );
  }

  const counts = stageCounts(summary);
  const rejected = documents.filter((document) => document.status === "rejected");

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------------------
          The headline and the bar.
          ------------------------------------------------------------------ */}
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h4
            className={cn(
              "text-[15px] font-bold",
              summary.rejected > 0 ? "text-destructive" : "text-foreground",
            )}
          >
            {documentHeadline(summary)}
          </h4>
          <span data-numeric className="text-[12px] font-semibold text-muted-foreground">
            {summary.total === 1 ? "1 document" : `${summary.total} documents`}
          </span>
        </div>

        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-valuenow={summary.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Document verification progress"
        >
          {/* Painted at full width and revealed by the track, so the gradient
              is a fixed sweep rather than one that compresses into itself as
              the bar grows — the same argument `ApplyProgress` makes. */}
          <div
            className={cn(
              "h-full w-full origin-left rounded-full transition-transform duration-[--duration-slow] ease-[--ease-out] motion-reduce:transition-none",
              summary.rejected > 0
                ? "bg-destructive"
                : "bg-[linear-gradient(90deg,var(--color-primary)_0%,var(--amber-500)_45%,var(--color-success)_100%)]",
            )}
            style={{ transform: `scaleX(${summary.percent / 100})` }}
          />
        </div>
      </div>

      {/* ------------------------------------------------------------------
          The rail. Three stages, each with the count standing at it.
          ------------------------------------------------------------------ */}
      <ol className="grid grid-cols-3 gap-2">
        {DOCUMENT_PROGRESS_STAGES.map((stage) => {
          const count = counts[stage.id];
          const reached = count > 0;

          return (
            <li
              key={stage.id}
              className={cn(
                "rounded-2xl border px-3 py-3 transition-colors",
                reached ? "border-border bg-surface" : "border-dashed border-border bg-transparent",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-7 items-center justify-center rounded-full",
                  stage.id === "verified" && reached
                    ? "bg-success-subtle text-success-subtle-foreground"
                    : reached
                      ? "bg-primary-subtle text-primary-subtle-foreground"
                      : "bg-surface-sunken text-muted-foreground",
                )}
              >
                {stage.id === "uploaded" ? (
                  <Upload className="size-3.5" />
                ) : stage.id === "checking" ? (
                  <Clock className="size-3.5" />
                ) : (
                  <Check className="size-3.5" strokeWidth={3} />
                )}
              </span>

              <p className="mt-2.5 flex items-baseline gap-1.5">
                <span
                  data-numeric
                  className={cn(
                    "text-[17px] font-bold leading-none",
                    reached ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {count}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  {stage.label}
                </span>
              </p>

              <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                {stage.description}
              </p>
            </li>
          );
        })}
      </ol>

      {/* ------------------------------------------------------------------
          Rejections, above the list, because they are the only rows that ask
          the applicant to do something.
          ------------------------------------------------------------------ */}
      {rejected.length > 0 && (
        <div className="rounded-2xl bg-destructive-subtle px-4 py-3.5">
          <p className="flex items-center gap-2 text-[13px] font-bold text-destructive">
            <AlertTriangle aria-hidden className="size-4 flex-shrink-0" />
            Replace these and we will re-check them
          </p>
          <ul className="mt-2 space-y-1.5">
            {rejected.map((document, index) => (
              <li key={`${document.kind}-${index}`} className="text-[12px] leading-relaxed text-destructive">
                <span className="font-semibold">
                  {KIND_LABEL[document.kind] ?? document.kind}
                </span>
                {" — "}
                {document.rejectionReason ?? "No reason was recorded."}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ------------------------------------------------------------------
          The documents themselves.
          ------------------------------------------------------------------ */}
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {documents.map((document, index) => (
          <li
            key={`${document.travellerPosition}-${document.kind}-${index}`}
            className="flex items-center gap-3 bg-surface px-4 py-3"
          >
            <StatusDot status={document.status} />

            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-bold text-foreground">
                {KIND_LABEL[document.kind] ?? document.kind}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                {travellerNames?.[document.travellerPosition] ??
                  `Traveller ${document.travellerPosition + 1}`}
                {" · "}
                <span data-numeric>{when.format(document.uploadedAt)}</span>
              </span>
            </span>

            <StatusChip status={document.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function StatusDot({ status }: { status: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 flex-shrink-0 items-center justify-center rounded-lg",
        status === "accepted"
          ? "bg-success-subtle text-success-subtle-foreground"
          : status === "rejected"
            ? "bg-destructive-subtle text-destructive"
            : "bg-primary-subtle text-primary-subtle-foreground",
      )}
    >
      {status === "accepted" ? (
        <Check className="size-4" strokeWidth={3} />
      ) : status === "rejected" ? (
        <AlertTriangle className="size-4" />
      ) : (
        <Clock className="size-4" />
      )}
    </span>
  );
}

/**
 * The chip, and the one word on it.
 *
 * "In review" for `pending`, and not "Pending" — which describes the row's
 * value in the database rather than what is happening to the applicant's
 * passport. The status column is ops vocabulary; this screen is not.
 */
function StatusChip({ status }: { status: string }) {
  const label =
    status === "accepted"
      ? "Verified"
      : status === "rejected"
        ? "Replace"
        : "In review";

  return (
    <span
      className={cn(
        "flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em]",
        status === "accepted"
          ? "bg-success-subtle text-success-subtle-foreground"
          : status === "rejected"
            ? "bg-destructive-subtle text-destructive"
            : "bg-surface-sunken text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}
