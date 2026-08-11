"use client";

/**
 * The price and context summary.
 *
 * Renders `ApplicationSummary` from `lib/application/state.ts` — the shared
 * read model — so the sticky aside, the mobile disclosure and the review step
 * all show one set of numbers from one computation.
 *
 * NO ARITHMETIC LIVES HERE (§16). Every figure, including the per-party
 * multiplication and the express surcharge split, is done in `buildSummary` on
 * top of `computeTotals`. This file formats and nothing else — if a line needs
 * a number that does not exist on the model, the model gains it rather than
 * this component computing it.
 *
 * The express surcharge row appears only when express is selected, because a
 * "₹0" line is noise.
 */

import { ShieldCheck } from "lucide-react";

import type { ApplicationSummary as Summary } from "@/lib/application/state";
import { FEE_NOT_PUBLISHED } from "@/lib/pricingConfig";

const inr = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

const longDate = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function travelDateLabel(summary: Summary): string {
  if (summary.travelDate) {
    const date = new Date(summary.travelDate);
    if (!Number.isNaN(date.getTime())) return longDate.format(date);
  }
  if (summary.travelWindow === "soon") return "Within 30 days";
  if (summary.travelWindow === "later") return "Not decided";
  return "Not set";
}

function Line({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={strong ? "text-xs font-semibold text-foreground" : "text-2xs text-muted-foreground"}>
        {label}
      </dt>
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

export function ApplicationSummaryPanel({
  summary,
  className = "",
}: {
  summary: Summary;
  className?: string;
}) {
  const { fees } = summary;
  const per = fees.travellers;

  return (
    <aside
      aria-label="Application summary"
      className={`rounded-xl border border-border bg-surface p-5 ${className}`}
    >
      <h2 className="text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Summary
      </h2>

      <dl className="mt-4 space-y-2.5">
        <Line label="Destination" value={summary.country.displayName} />
        <Line label="Visa" value={summary.country.visaType} />
        <Line
          label="Travellers"
          value={String(summary.travellers.count || "—")}
        />
        <Line
          label="Processing"
          value={`${summary.plan.label} · ${summary.plan.deliveryDays}${
            summary.plan.deliveryDays === 1 ? " day" : " days"
          }`}
        />
        <Line label="Travel date" value={travelDateLabel(summary)} />
        {summary.documents.requiredCount > 0 && (
          <Line
            label="Documents"
            value={`${summary.documents.providedCount}/${summary.documents.requiredCount}`}
          />
        )}
      </dl>

      <div className="mt-5 border-t border-border pt-4">
        <dl className="space-y-2.5">
          <Line
            label={`Government fee${per > 1 ? ` × ${per}` : ""}`}
            value={inr(fees.governmentFee * per)}
          />
          <Line
            label={`Keyrise fee${per > 1 ? ` × ${per}` : ""}`}
            value={
              fees.baseServiceFee === null
                ? FEE_NOT_PUBLISHED
                : inr(fees.baseServiceFee * per)
            }
          />
          {fees.expressSurcharge > 0 && (
            <Line
              label={`Express${per > 1 ? ` × ${per}` : ""}`}
              value={inr(fees.expressSurcharge * per)}
            />
          )}
          <Line
            label="GST (18%)"
            value={fees.gst === null ? FEE_NOT_PUBLISHED : inr(fees.gst * per)}
          />
        </dl>

        <div className="mt-3.5 border-t border-border-strong pt-3.5">
          <Line
            label="Total"
            value={fees.total === null ? FEE_NOT_PUBLISHED : inr(fees.total)}
            strong
          />
        </div>

        <p className="mt-3 text-2xs leading-relaxed text-muted-foreground">
          {fees.payNow === 0
            ? "No government fee"
            : `${inr(fees.payNow * per)} government fee up front`}
          {fees.payOnApproval === null
            ? " · Keyrise fee not yet published."
            : ` · ${inr(fees.payOnApproval * per)} to Keyrise on approval.`}
        </p>
      </div>

      <p className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-2xs leading-relaxed text-muted-foreground">
        <ShieldCheck aria-hidden className="mt-px size-3.5 flex-shrink-0 text-success" />
        On time or the Keyrise fee is waived. Refused and the government fee is
        refunded.
      </p>
    </aside>
  );
}
