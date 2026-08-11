"use client";

/**
 * Step 4 — check everything over.
 *
 * The applicant should be able to answer "what exactly am I about to send?"
 * from this screen alone, so it shows every field the application holds, not a
 * flattering précis. Each block links back to the step that owns it — jumping
 * to the step rather than making them hunt the rail — and `jumpTo` runs the
 * same reachability check as everything else, so an edit link can never strand
 * them somewhere the flow refuses to leave.
 *
 * The fee block repeats what the sticky summary shows, deliberately: the aside
 * is hidden below xl, and "check everything over" cannot mean "except the
 * price". Both read `summary.fees`, so they cannot disagree.
 */

import { Pencil } from "lucide-react";

import { useApplication } from "@/lib/application/context";
import { EMPTY_DETAILS } from "@/lib/application/state";
import { FEE_NOT_PUBLISHED } from "@/lib/pricingConfig";

const inr = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

const longDate = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function Block({
  title,
  onEdit,
  editLabel,
  children,
}: {
  title: string;
  onEdit: () => void;
  editLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface">
      <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <button
          type="button"
          onClick={onEdit}
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-2xs font-semibold text-muted-foreground transition-colors hover:bg-surface-sunken hover:text-foreground"
        >
          <Pencil aria-hidden className="size-3" />
          Edit
          <span className="sr-only"> {editLabel}</span>
        </button>
      </header>
      <div className="px-4 py-3.5">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-2xs text-muted-foreground">{label}</dt>
      <dd className="text-right text-2xs font-semibold text-foreground">{value}</dd>
    </div>
  );
}

export function ReviewStep() {
  const { state, summary, steps, jumpTo } = useApplication();
  if (!summary) return null;

  const hasDocuments = steps.some((step) => step.id === "documents");
  const per = summary.fees.travellers;

  const travelDate = summary.travelDate
    ? longDate.format(new Date(summary.travelDate))
    : summary.travelWindow === "soon"
      ? "Within 30 days"
      : summary.travelWindow === "later"
        ? "Not decided yet"
        : "Not set";

  return (
    <div className="space-y-4">
      <Block title="Trip" editLabel="your trip" onEdit={() => jumpTo("setup")}>
        <dl className="divide-y divide-border">
          <Row label="Destination" value={summary.country.displayName} />
          <Row label="Visa type" value={summary.country.visaType} />
          {summary.country.validity && (
            <Row label="Validity" value={summary.country.validity} />
          )}
          <Row
            label="Processing"
            value={`${summary.plan.label} · ${summary.plan.deliveryDays} ${
              summary.plan.deliveryDays === 1 ? "day" : "days"
            }`}
          />
          <Row label="Travel date" value={travelDate} />
          <Row
            label="Travellers"
            value={
              summary.travellers.names.length
                ? summary.travellers.names.join(", ")
                : String(summary.travellers.count)
            }
          />
        </dl>
      </Block>

      {hasDocuments && (
        <Block
          title="Documents"
          editLabel="your documents"
          onEdit={() => jumpTo("documents")}
        >
          <dl className="divide-y divide-border">
            {summary.documents.perTraveller.map((entry) => (
              <Row
                key={entry.traveller.id}
                label={entry.traveller.firstName || "Unnamed traveller"}
                value={
                  entry.complete
                    ? entry.required.map((r) => r.shortLabel).join(", ")
                    : `Missing ${entry.missing.map((r) => r.shortLabel).join(", ")}`
                }
              />
            ))}
          </dl>
        </Block>
      )}

      <Block
        title="Passport details"
        editLabel="passport details"
        onEdit={() => jumpTo("details")}
      >
        <div className="space-y-4">
          {state.travellers.map((traveller) => {
            const details = state.details[traveller.id] ?? EMPTY_DETAILS;
            return (
              <dl key={traveller.id} className="divide-y divide-border">
                <p className="pb-1.5 text-2xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {traveller.firstName || "Traveller"}
                </p>
                <Row label="Full name" value={details.fullName || "—"} />
                <Row label="Date of birth" value={details.dateOfBirth || "—"} />
                <Row label="Passport number" value={details.passportNumber || "—"} />
                <Row label="Passport expiry" value={details.passportExpiry || "—"} />
                <Row label="Nationality" value={details.nationality || "—"} />
                <Row label="Gender" value={details.gender || "—"} />
              </dl>
            );
          })}

          <dl className="divide-y divide-border border-t border-border pt-2">
            <Row label="Email" value={state.contact.email || "—"} />
            <Row label="Phone" value={state.contact.phone || "—"} />
          </dl>
        </div>
      </Block>

      <Block title="What you pay" editLabel="your plan" onEdit={() => jumpTo("setup")}>
        <dl className="divide-y divide-border">
          <Row
            label={`Government fee${per > 1 ? ` × ${per}` : ""}`}
            value={inr(summary.fees.governmentFee * per)}
          />
          <Row
            label={`Keyrise fee${per > 1 ? ` × ${per}` : ""}`}
            value={
              summary.fees.baseServiceFee === null
                ? FEE_NOT_PUBLISHED
                : inr(summary.fees.baseServiceFee * per)
            }
          />
          {summary.fees.expressSurcharge > 0 && (
            <Row
              label={`Express processing${per > 1 ? ` × ${per}` : ""}`}
              value={inr(summary.fees.expressSurcharge * per)}
            />
          )}
          <Row
            label="GST (18%)"
            value={
              summary.fees.gst === null
                ? FEE_NOT_PUBLISHED
                : inr(summary.fees.gst * per)
            }
          />
        </dl>

        <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-border-strong pt-3">
          <span className="text-sm font-semibold text-foreground">Total</span>
          <span
            data-numeric
            className="text-xl font-bold tracking-tight text-foreground"
          >
            {summary.fees.total === null
              ? FEE_NOT_PUBLISHED
              : inr(summary.fees.total)}
          </span>
        </div>
        <p className="mt-2 text-2xs leading-relaxed text-muted-foreground">
          {summary.fees.payNow === 0
            ? "No government fee"
            : `${inr(summary.fees.payNow * per)} government fee up front`}
          {summary.fees.payOnApproval === null
            ? " · the Keyrise fee is not yet published."
            : ` · ${inr(summary.fees.payOnApproval * per)} to Keyrise once the visa is granted.`}
        </p>
      </Block>
    </div>
  );
}
