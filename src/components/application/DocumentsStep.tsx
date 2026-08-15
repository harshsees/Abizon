"use client";

/**
 * Step 2 — the documents this destination asks for.
 *
 * TWO VIEWS, ONE STEP. A checklist, and a focused capture view reached by
 * choosing a row. The checklist answers "how much is left"; the capture view
 * answers "how do I do this one". Trying to serve both at once is what makes
 * document steps feel like paperwork — four dashed boxes stacked down a page,
 * none of them the thing you are currently doing.
 *
 * EVERY requirement comes from `requiredDocuments(country.documents)`, shared
 * with `VisaRequirements` and `CountryApplicationPanel`. Nothing is invented:
 * where the dataset says "Passport Only", exactly one row appears, and the
 * whole step disappears for destinations that ask for nothing.
 *
 * The "why" line is `requirement.detail` — real guidance about the document
 * itself (six months' validity, plain background), not a fabricated per-country
 * rule. There is no per-country reason text because there is no per-country
 * reason data.
 */

import { AlertCircle, Check, ChevronRight, CloudUpload, Circle, Loader2 } from "lucide-react";
import { useState } from "react";

import { useApplication } from "@/lib/application/context";
import type { DocumentKind } from "@/lib/application/documents";
import { documentKey, travellerDocumentState } from "@/lib/application/state";
import { cn } from "@/lib/utils";

import { PassportCapture } from "./PassportCapture";

type OpenDocument = { travellerId: string; kind: DocumentKind };

export function DocumentsStep() {
  const { state, dispatch, country, sync } = useApplication();
  const [open, setOpen] = useState<OpenDocument | null>(null);

  if (!country) return null;

  /* ---------------------------------------------------------------------- */
  /* Focused capture view                                                    */
  /* ---------------------------------------------------------------------- */

  const traveller = open
    ? state.travellers.find((t) => t.id === open.travellerId)
    : undefined;
  const requirement =
    traveller && open
      ? travellerDocumentState(state, country, traveller).required.find(
          (r) => r.kind === open.kind,
        )
      : undefined;

  // A traveller removed while their document was open resolves to nothing, and
  // the checklist renders instead. Deliberately NOT a `setOpen(null)` during
  // render: a render-phase state update to recover from stale state is a
  // second source of truth for which view is showing.
  if (open && traveller && requirement) {
    return (
      <PassportCapture
        requirement={requirement}
        travellerName={traveller.firstName}
        entry={state.documents[documentKey(traveller.id, requirement.kind)]}
        onBack={() => setOpen(null)}
        onProvide={(entry) =>
          dispatch({
            type: "setDocument",
            travellerId: traveller.id,
            kind: requirement.kind,
            entry,
          })
        }
        onClear={() =>
          dispatch({
            type: "clearDocument",
            travellerId: traveller.id,
            kind: requirement.kind,
          })
        }
        onRetry={() => sync.retryDocument(traveller.id, requirement.kind)}
      />
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Checklist                                                               */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="space-y-8">
      {state.travellers.map((traveller) => {
        const status = travellerDocumentState(state, country, traveller);

        return (
          <section key={traveller.id} className="space-y-3">
            <header className="flex items-baseline justify-between gap-4">
              <h2 className="text-sm font-semibold text-foreground">
                {traveller.firstName || "Unnamed traveller"}
              </h2>
              <p
                className={cn(
                  "text-2xs font-semibold",
                  status.complete
                    ? "text-success-subtle-foreground"
                    : "text-muted-foreground",
                )}
              >
                {status.complete
                  ? "All attached"
                  : `${status.provided.length} of ${status.required.length}`}
              </p>
            </header>

            <ul className="overflow-hidden rounded-xl border border-border">
              {status.required.map((requirement, index) => {
                const entry =
                  state.documents[documentKey(traveller.id, requirement.kind)];
                const provided = Boolean(entry);

                return (
                  <li key={requirement.kind}>
                    <button
                      type="button"
                      onClick={() =>
                        setOpen({ travellerId: traveller.id, kind: requirement.kind })
                      }
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-3.5 bg-surface p-4 text-left",
                        "transition-colors duration-[--duration-fast] hover:bg-surface-sunken",
                        index > 0 && "border-t border-border",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full",
                          provided
                            ? "bg-success-subtle text-success-subtle-foreground"
                            : "bg-surface-sunken text-muted-foreground",
                        )}
                      >
                        {entry?.upload === "uploading" ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : entry?.previewDataUrl ? (
                          <img
                            src={entry.previewDataUrl}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : provided ? (
                          <Check className="size-4" />
                        ) : (
                          <Circle className="size-3.5" />
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {requirement.label}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 block truncate text-2xs",
                            entry?.upload === "failed"
                              ? "text-destructive"
                              : "text-muted-foreground",
                          )}
                        >
                          {entry?.upload === "failed"
                            ? (entry.error ?? "Upload failed — select to try again")
                            : entry?.upload === "uploading"
                              ? "Uploading…"
                              : provided
                                ? (entry?.fileName ?? "Photographed with your camera")
                                : requirement.detail}
                        </span>
                      </span>

                      <span className="flex flex-shrink-0 items-center gap-2">
                        {/* The one badge that is a state and not a label. It
                            appears only once the bytes are on the server,
                            because that is the only point at which closing the
                            tab stops costing the applicant the file. */}
                        {entry?.upload === "stored" && (
                          <span
                            title="Saved to your application"
                            className="hidden items-center gap-1 rounded-full bg-success-subtle px-2 py-0.5 text-2xs font-semibold text-success-subtle-foreground sm:inline-flex"
                          >
                            <CloudUpload aria-hidden className="size-3" />
                            Saved
                          </span>
                        )}
                        {entry?.upload === "failed" && (
                          <AlertCircle aria-hidden className="size-4 text-destructive" />
                        )}
                        {!provided && (
                          <span className="hidden rounded-full bg-surface-sunken px-2 py-0.5 text-2xs font-semibold text-muted-foreground sm:inline">
                            Required
                          </span>
                        )}
                        <ChevronRight
                          aria-hidden
                          className="size-4 text-muted-foreground"
                        />
                      </span>

                      <span className="sr-only">
                        {provided ? " — attached, select to replace" : " — not yet attached"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {/* THE COPY BRANCHES ON WHAT IS ACTUALLY TRUE.

          Until this commit there was one sentence — "nothing is uploaded to a
          server yet" — and it was correct. It is now correct for exactly one of
          the two modes, and saying it in the other would be the same class of
          lie the flow was rebuilt to remove: telling the applicant their
          documents are safe, or telling them they are not, without either being
          the case. */}
      {sync.mode === "synced" ? (
        <p className="text-2xs leading-relaxed text-muted-foreground">
          Each document is uploaded to your account as you attach it, so you can
          close this tab and finish on another device. Passport scans are
          encrypted at rest and deleted on a schedule once your application
          closes.
        </p>
      ) : (
        <p className="text-2xs leading-relaxed text-muted-foreground">
          Your files stay in this browser tab. Nothing is uploaded to a server,
          and no document is saved to this device — closing the tab discards
          them.
        </p>
      )}
    </div>
  );
}
