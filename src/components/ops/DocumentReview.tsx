"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { Check, Eye, X } from "lucide-react";

import { documentUrlAction, reviewDocumentAction } from "@/app/actions/ops";
import { Button } from "@/components/ui/button";

/**
 * ONE DOCUMENT, AND THE THREE THINGS THAT CAN BE DONE TO IT.
 * ---------------------------------------------------------------------------
 * THERE IS NO DOWNLOAD BUTTON, and that is a decision rather than an omission.
 *
 * `lib/storage/normalise.ts` says plainly that re-encoding through `sharp` is
 * not virus scanning: it defeats a polyglot file, and it does nothing about an
 * image that is also somebody's payload, or about the general risk of an ops
 * person saving applicant-supplied files onto a Windows laptop. The two real
 * answers are a scanning step, or a console that renders and never downloads.
 *
 * This is the second. If a download is ever added, the first stops being
 * advisable and becomes mandatory.
 *
 * The image is fetched through a signed URL minted on click and valid for sixty
 * seconds. Not signed at render: a page left open in a tab would otherwise hold
 * live links to every passport on the application for as long as it stayed open.
 */

export type DocumentReviewProps = {
  document: {
    id: string;
    kind: string;
    status: string;
    rejectionReason: string | null;
    storagePath: string;
    uploadedAt: number;
  };
  applicationId: string;
  travellerName: string;
  canReview: boolean;
};

/**
 * The applicant's word for the document, for the person reviewing it.
 *
 * Deliberately a `Record<string, string>` with a fallback at the call site
 * rather than a `Record<DocumentKind, string>`: an ops console that throws
 * because the database grew a kind it has not been taught to name is an ops
 * console down at exactly the moment somebody needs it. An unknown kind shows
 * its raw enum value, which is ugly and legible and reviewable.
 *
 * The last three are trip documents, filed once for the whole party against
 * the lead traveller — so the same PAN card appears under one name however
 * many people are on the application. `documents.ts` explains why.
 */
const KIND_LABEL: Record<string, string> = {
  passport: "Passport data page",
  photograph: "Photograph",
  panCard: "PAN card",
  returnTicket: "Return ticket",
  hotelStay: "Hotel booking",
};

export function DocumentReview({
  document,
  applicationId,
  travellerName,
  canReview,
}: DocumentReviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const open = useAction(documentUrlAction, {
    onSuccess: ({ data }) => setUrl(data?.url ?? null),
  });

  const review = useAction(reviewDocumentAction, {
    onSuccess: () => setRejecting(false),
  });

  const busy = open.isPending || review.isPending;

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">
            {KIND_LABEL[document.kind] ?? document.kind}
          </p>
          <p className="text-xs text-muted-foreground">
            {travellerName} · uploaded{" "}
            {new Date(document.uploadedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        <StatusPill status={document.status} />
      </div>

      {document.rejectionReason ? (
        <p className="mt-3 rounded-md bg-destructive-subtle px-3 py-2 text-xs text-destructive-subtle-foreground">
          Rejected: {document.rejectionReason}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          loading={open.isPending}
          onClick={() =>
            url
              ? setUrl(null)
              : open.execute({ documentId: document.id, storagePath: document.storagePath })
          }
        >
          <Eye className="size-4" />
          {url ? "Hide" : "View"}
        </Button>

        {canReview && document.status !== "accepted" ? (
          <Button
            type="button"
            size="sm"
            variant="success"
            loading={review.isPending}
            disabled={busy}
            onClick={() =>
              review.execute({
                documentId: document.id,
                applicationId,
                decision: "accepted",
              })
            }
          >
            <Check className="size-4" />
            Accept
          </Button>
        ) : null}

        {canReview && document.status !== "rejected" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => setRejecting((value) => !value)}
          >
            <X className="size-4" />
            Reject
          </Button>
        ) : null}
      </div>

      {rejecting ? (
        <div className="mt-3 space-y-2">
          <label className="block text-xs font-bold text-foreground" htmlFor={`reason-${document.id}`}>
            Why? The applicant is emailed this word for word.
          </label>
          <textarea
            id={`reason-${document.id}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            maxLength={300}
            placeholder="The passport number is not legible in the bottom right."
            className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
          <Button
            type="button"
            size="sm"
            loading={review.isPending}
            disabled={reason.trim().length < 5}
            onClick={() =>
              review.execute({
                documentId: document.id,
                applicationId,
                decision: "rejected",
                reason: reason.trim(),
              })
            }
          >
            Reject and tell them
          </Button>
        </div>
      ) : null}

      {review.result?.serverError ? (
        <p role="alert" className="mt-3 text-xs font-semibold text-destructive">
          {review.result.serverError}
        </p>
      ) : null}

      {url ? (
        <div className="mt-4 overflow-hidden rounded-md border border-border bg-surface-sunken">
          {/* eslint-disable-next-line @next/next/no-img-element -- a signed URL
              valid for sixty seconds cannot go through the image optimiser: the
              optimiser caches by URL, and caching a passport scan on a CDN is
              precisely what the short signature exists to prevent. */}
          <img
            src={url}
            alt={`${KIND_LABEL[document.kind] ?? document.kind} for ${travellerName}`}
            className="mx-auto max-h-[70vh] w-auto"
          />
          <p className="border-t border-border px-3 py-2 text-2xs text-muted-foreground">
            This link expires in about a minute. Your name is recorded against
            opening it.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-surface-sunken text-muted-foreground",
    accepted: "bg-success-subtle text-success-subtle-foreground",
    rejected: "bg-destructive-subtle text-destructive-subtle-foreground",
  };

  return (
    <span
      className={`rounded-sm px-2 py-0.5 text-2xs font-bold capitalize ${
        styles[status] ?? styles.pending
      }`}
    >
      {status}
    </span>
  );
}
