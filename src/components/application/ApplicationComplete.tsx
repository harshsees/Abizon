"use client";

/**
 * The terminal step.
 *
 * §21 in one sentence: this screen may only claim what actually happened. That
 * rule has not changed; what has changed is what can happen.
 *
 * WHAT THIS REPLACES. The deleted `MultiStepApplicationForm` ended on a 1400ms
 * `setTimeout`, then announced "Application submitted successfully", minted an
 * id by splicing the travel date and the last four passport characters into
 * `UAE-140826-7X2K`, and linked to a tracking page for it. Nothing was sent.
 * An applicant could have closed the tab believing a government application was
 * in progress, and only found out at the airport.
 *
 * THE REBUILD THEN HAD NO SUBMIT BUTTON, and the header of this file used to
 * explain why: there was no submission endpoint, and a disabled button — or one
 * that opened a "coming soon" toast — would have been a worse lie than the
 * absence, because it would imply the button was the only missing piece.
 *
 * THERE IS NOW AN ENDPOINT. `submitApplicationAction` writes a real status
 * transition, records who made it, and returns a reference that resolves on the
 * tracking page. So the button exists, and it appears **only** when it can do
 * something: signed in, with a backend, with every document on the server.
 * Without those the screen is exactly what it was, because in that case nothing
 * about the old explanation has stopped being true.
 *
 * WHAT IS STILL NOT CLAIMED. Nothing is charged. Abizon cannot take a payment
 * online — that is genuinely not built — and `pricingConfig.ts` still marks the
 * service fee provisional. Submitting means the application reaches Abizon's
 * queue, not that it reaches a consulate, and the copy says which.
 */

import { CircleAlert, Info, Loader2, Send } from "lucide-react";
import Link from "next/link";

import { getCountrySlug } from "@/data/countries";
import { useApplication } from "@/lib/application/context";
import { FEE_NOT_PUBLISHED } from "@/lib/pricingConfig";

const inr = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

export function ApplicationComplete() {
  const { summary, country, jumpTo, sync } = useApplication();
  if (!summary || !country) return null;

  const ready = summary.readiness === "ready-for-submission";
  const per = summary.fees.travellers;

  /* ---------------------------------------------------------------------- */
  /* Submitted                                                              */
  /* ---------------------------------------------------------------------- */

  if (sync.submittedReference) {
    return (
      <div className="space-y-5">
        <div
          role="status"
          className="rounded-xl border border-border bg-surface-sunken p-5 sm:p-6"
        >
          <p className="text-sm font-semibold text-foreground">
            Your {summary.country.displayName} application is with Abizon.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            We have everything for{" "}
            {summary.travellers.count === 1
              ? "one traveller"
              : `${summary.travellers.count} travellers`}
            . Someone will check the documents and write to you when the status
            changes. There is nothing else for you to do right now.
          </p>

          <div className="mt-5 rounded-lg bg-surface-sunken px-4 py-3">
            <p className="text-2xs text-muted-foreground">Your reference</p>
            <p
              data-numeric
              className="mt-0.5 font-mono text-lg font-bold tracking-tight text-foreground"
            >
              {sync.submittedReference}
            </p>
          </div>
        </div>

        {/* Still true, and still the most important sentence on the page. */}
        <div className="flex gap-3 rounded-xl border border-border bg-surface-sunken p-5">
          <Info aria-hidden className="mt-0.5 size-4 flex-shrink-0 text-muted-foreground" />
          <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
            <p className="text-sm font-semibold text-foreground">
              Nothing has been charged.
            </p>
            <p>
              Abizon cannot take a payment online yet. Fees are settled with you
              directly before anything is filed with{" "}
              {summary.country.displayName}.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/track/${sync.submittedReference}`}
            className="inline-flex h-12 items-center rounded-full bg-foreground px-6 text-sm font-bold text-background transition-colors hover:bg-subtle-foreground sm:h-11"
          >
            Track this application
          </Link>
          <Link
            href="/profile"
            className="inline-flex h-12 items-center rounded-full border border-border-strong bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-sunken sm:h-11"
          >
            Your applications
          </Link>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="space-y-5">
        <div
          role="status"
          className="flex gap-3 rounded-xl border border-border bg-surface-sunken p-5"
        >
          <CircleAlert
            aria-hidden
            className="mt-0.5 size-4 flex-shrink-0 text-warning-subtle-foreground"
          />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Something is still outstanding
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Go back through the steps and finish whichever one is still marked
              incomplete in the rail.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => jumpTo("review")}
          className="inline-flex h-12 cursor-pointer items-center rounded-full border border-border-strong bg-surface px-5 sm:h-11 text-sm font-semibold text-foreground transition-colors hover:bg-surface-sunken"
        >
          Back to review
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div
        role="status"
        className="rounded-xl border border-border bg-surface-sunken p-5 sm:p-6"
      >
        <p className="text-sm font-semibold text-foreground">
          Your {summary.country.displayName} application is complete.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Everything Abizon needs for{" "}
          {summary.travellers.count === 1
            ? "one traveller"
            : `${summary.travellers.count} travellers`}{" "}
          is here — {summary.documents.providedCount} document
          {summary.documents.providedCount === 1 ? "" : "s"} and{" "}
          {summary.passport.total === 1
            ? "one set of passport details"
            : `${summary.passport.total} sets of passport details`}
          .
        </p>
      </div>

      {/* The most important block on the page, and the one that has to change
          with the mode — because in one of them "nothing has left this device"
          is true and in the other it is the opposite of true. */}
      <div className="flex gap-3 rounded-xl border border-border bg-surface-sunken p-5">
        <Info aria-hidden className="mt-0.5 size-4 flex-shrink-0 text-muted-foreground" />
        <div className="space-y-2.5 text-xs leading-relaxed text-muted-foreground">
          <p className="text-sm font-semibold text-foreground">
            {sync.mode === "synced"
              ? "Nothing has been filed yet, and nothing has been charged."
              : "Nothing has been filed, and nothing has been charged."}
          </p>
          {sync.mode === "synced" ? (
            <p>
              Your application is saved to your account and your documents are
              stored securely. It has not been sent to Abizon for filing until
              you submit it below.
            </p>
          ) : (
            <p>
              Abizon cannot yet accept a submission or a payment online. Your
              answers are held in this browser tab and the documents you attached
              have not left this device — closing the tab discards the files, and
              the rest of your progress stays on this device only.
            </p>
          )}
          <p>
            When filing opens,{" "}
            {summary.fees.payNow === 0
              ? `${summary.country.displayName} charges no government fee`
              : `${inr(summary.fees.payNow * per)} government fee is payable up front`}
            {summary.fees.payOnApproval === null || summary.fees.total === null ? (
              // The government fee is real and stays. The Abizon side is not,
              // so the sentence stops rather than completing itself with a
              // number nobody has agreed.
              <>. The Abizon fee is not yet published.</>
            ) : (
              <>
                {" "}
                and {inr(summary.fees.payOnApproval * per)} to Abizon once the
                visa is granted — {inr(summary.fees.total)} in total.
              </>
            )}
          </p>
        </div>
      </div>

      {/* §15 — the final state summarises the application, not just its total.
          Every value is read from the shared summary model, so this screen
          cannot disagree with the review step or the sticky aside. */}
      <dl className="divide-y divide-border rounded-xl border border-border bg-surface-sunken px-4">
        <FinalRow label="Destination" value={summary.country.displayName} />
        <FinalRow label="Visa" value={summary.country.visaType} />
        <FinalRow
          label="Travellers"
          value={
            summary.travellers.names.length
              ? summary.travellers.names.join(", ")
              : String(summary.travellers.count)
          }
        />
        <FinalRow
          label="Processing"
          value={`${summary.plan.label} · ${summary.plan.deliveryDays} ${
            summary.plan.deliveryDays === 1 ? "day" : "days"
          }`}
        />
        {summary.documents.requiredCount > 0 && (
          <FinalRow
            label="Documents"
            value={`${summary.documents.providedCount} of ${summary.documents.requiredCount} attached`}
          />
        )}
        <FinalRow
          label="Passport details"
          value={`${summary.passport.completeCount} of ${summary.passport.total} complete`}
        />
        <FinalRow
          label="Total"
          value={
            summary.fees.total === null
              ? FEE_NOT_PUBLISHED
              : inr(summary.fees.total)
          }
          strong
        />
      </dl>

      {/* THE SUBMIT BUTTON EXISTS ONLY WHERE IT CAN WORK.

          Not disabled-and-visible in local mode: a greyed-out Submit implies
          the button is the last missing piece, when in fact there is no account
          to submit against. The absence is the honest signal, and the block
          above says why. */}
      {sync.mode === "synced" && <SubmitPanel />}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => jumpTo("review")}
          className="inline-flex h-12 cursor-pointer items-center rounded-full border border-border-strong bg-surface px-5 sm:h-11 text-sm font-semibold text-foreground transition-colors hover:bg-surface-sunken"
        >
          Change something
        </button>
        <Link
          href={`/visa/${getCountrySlug(country.name)}`}
          className="inline-flex h-12 items-center rounded-xl px-5 text-sm font-semibold text-muted-foreground sm:h-11 transition-colors hover:text-foreground"
        >
          Back to {summary.country.displayName}
        </Link>
      </div>
    </div>
  );
}

/**
 * Submission is the one irreversible step in the flow, so it gets its own
 * block, its own confirmation sentence, and a button that is disabled for
 * reasons it names.
 *
 * The gate is `documentsStored`, not "documents attached". A document sitting
 * in this tab because its upload failed would submit an application the ops
 * queue sees as missing a passport — and the applicant would have been told it
 * was filed. The server refuses that too (`submitApplication` counts document
 * rows), and this is the same refusal said in advance rather than as an error.
 */
function SubmitPanel() {
  const { summary, sync } = useApplication();
  if (!summary) return null;

  const needsDocuments = summary.documents.requiredCount > 0;
  const waitingOnUploads = needsDocuments && !sync.documentsStored;

  const reason = sync.uploading
    ? "Waiting for your documents to finish uploading."
    : waitingOnUploads
      ? "One of your documents has not reached us yet. Open the documents step and check."
      : undefined;

  return (
    <div className="rounded-xl border border-border bg-surface-sunken p-5 sm:p-6">
      <p className="text-sm font-semibold text-foreground">Send this to Abizon</p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        You will get a reference, and we will email you when the status changes.
        You can still be contacted about anything that needs correcting.
      </p>

      {sync.error && (
        <p role="alert" className="mt-3 text-xs font-semibold text-destructive">
          {sync.error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void sync.submit()}
        disabled={sync.submitting || Boolean(reason)}
        className="mt-4 inline-flex h-12 cursor-pointer items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-on-primary shadow-e2 transition-[background-color,transform] duration-[--duration-fast] hover:bg-primary-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transform-none sm:h-11"
      >
        {sync.submitting ? (
          <Loader2 aria-hidden className="size-4 animate-spin" />
        ) : (
          <Send aria-hidden className="size-4" />
        )}
        {sync.submitting ? "Submitting…" : "Submit application"}
      </button>

      {reason && (
        <p role="status" className="mt-2.5 text-2xs text-muted-foreground">
          {reason}
        </p>
      )}
    </div>
  );
}

function FinalRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-2xs text-muted-foreground">{label}</dt>
      <dd
        data-numeric
        className={
          strong
            ? "text-sm font-bold tracking-tight text-foreground"
            : "text-2xs font-semibold text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}
