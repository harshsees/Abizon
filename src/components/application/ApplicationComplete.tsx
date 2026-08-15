"use client";

/**
 * The terminal step — READY TO SUBMIT.
 *
 * §21 in one sentence: this screen may only claim what actually happened, and
 * what actually happened is that a complete application now exists in this
 * browser. It has not been filed. Nothing has been charged. So the heading is
 * "Ready to submit" and the confirmation mark is neutral, not a green tick —
 * a green tick is the universal symbol for "done", and this is not done.
 *
 * WHAT THIS REPLACES. The deleted `MultiStepApplicationForm` ended on a 1400ms
 * `setTimeout`, then announced "Application submitted successfully", minted an
 * id by splicing the travel date and the last four passport characters into
 * `UAE-140826-7X2K`, and linked to a tracking page for it. Nothing was sent.
 * An applicant could have closed the tab believing a government application was
 * in progress, and only found out at the airport.
 *
 * There is no submit button because there is no submission endpoint. Adding a
 * disabled one, or one that opened a "coming soon" toast, would be a worse lie
 * than the absence: it would imply the button is the only missing piece.
 */

import { CircleAlert, Info } from "lucide-react";
import Link from "next/link";

import { getCountrySlug } from "@/data/countries";
import { useApplication } from "@/lib/application/context";
import { FEE_NOT_PUBLISHED } from "@/lib/pricingConfig";

const inr = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

export function ApplicationComplete() {
  const { summary, country, jumpTo } = useApplication();
  if (!summary || !country) return null;

  const ready = summary.readiness === "ready-for-submission";
  const per = summary.fees.travellers;

  if (!ready) {
    return (
      <div className="space-y-5">
        <div
          role="status"
          className="flex gap-3 rounded-xl border border-border bg-surface p-5"
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
          className="inline-flex h-12 cursor-pointer items-center rounded-xl border border-border bg-surface px-5 sm:h-11 text-sm font-semibold text-foreground transition-colors hover:bg-surface-sunken"
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
        className="rounded-xl border border-border bg-surface p-5 sm:p-6"
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

      {/* The most important block on the page. */}
      <div className="flex gap-3 rounded-xl border border-border bg-surface-sunken p-5">
        <Info aria-hidden className="mt-0.5 size-4 flex-shrink-0 text-muted-foreground" />
        <div className="space-y-2.5 text-xs leading-relaxed text-muted-foreground">
          <p className="text-sm font-semibold text-foreground">
            Nothing has been filed, and nothing has been charged.
          </p>
          <p>
            Abizon cannot yet accept a submission or a payment online. Your
            answers are held in this browser tab and the documents you attached
            have not left this device — closing the tab discards the files, and
            the rest of your progress stays on this device only.
          </p>
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
      <dl className="divide-y divide-border rounded-xl border border-border bg-surface px-4">
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

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => jumpTo("review")}
          className="inline-flex h-12 cursor-pointer items-center rounded-xl border border-border bg-surface px-5 sm:h-11 text-sm font-semibold text-foreground transition-colors hover:bg-surface-sunken"
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
