/**
 * THE DISCLOSURE BLOCK, ON EVERY PAGE THAT OWES ONE.
 *
 * Terms, privacy and the refunds policy each have to carry the same entity
 * details and the same grievance route — the Consumer Protection (E-Commerce)
 * Rules put them on the seller's page, the IT Rules put them on the
 * intermediary's, and the DPDP Act puts them wherever the Data Principal is
 * told about processing. Three copies of one address is two copies that go
 * stale, so there is one component and one source of facts in `lib/legal.ts`.
 *
 * ── The incomplete state is a rendered state ──
 *
 * When the entity details have not been filled in, this does NOT quietly
 * disappear. It renders a block saying they are not yet published, listing
 * what is missing. A statutory disclosure that is absent is a compliance gap
 * whichever way it is absent; the difference is that a visible gap gets closed
 * and a silent one gets deployed.
 */

import { ShieldAlert } from "lucide-react";

import {
  GRIEVANCE_ACKNOWLEDGEMENT_HOURS,
  GRIEVANCE_OFFICER,
  GRIEVANCE_RESOLUTION_DAYS,
  LEGAL_ENTITY,
  disclosuresComplete,
} from "@/lib/legal";

export function StatutoryDisclosures() {
  if (!disclosuresComplete()) return <NotYetPublished />;

  return (
    <div className="not-prose rounded-2xl border border-border bg-surface-sunken p-6">
      <h3 className="text-sm font-bold text-foreground">
        Who you are contracting with
      </h3>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <Row label="Registered name" value={LEGAL_ENTITY.registeredName} />
        {LEGAL_ENTITY.cin && <Row label="CIN" value={LEGAL_ENTITY.cin} numeric />}
        <Row label="GSTIN" value={LEGAL_ENTITY.gstin} numeric />
        <Row label="Registered office" value={LEGAL_ENTITY.registeredAddress} />
      </dl>

      <h3 className="mt-7 text-sm font-bold text-foreground">
        Grievance Officer
      </h3>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        Appointed under Rule 3(2) of the Information Technology (Intermediary
        Guidelines and Digital Media Ethics Code) Rules 2021 and Rule 4(3) of the
        Consumer Protection (E-Commerce) Rules 2020.
      </p>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <Row label="Name" value={GRIEVANCE_OFFICER.name} />
        <Row label="Designation" value={GRIEVANCE_OFFICER.designation} />
        <Row
          label="Email"
          value={GRIEVANCE_OFFICER.email}
          href={`mailto:${GRIEVANCE_OFFICER.email}`}
        />
        {GRIEVANCE_OFFICER.phone && (
          <Row label="Telephone" value={GRIEVANCE_OFFICER.phone} numeric />
        )}
        <Row label="Address" value={GRIEVANCE_OFFICER.address} />
      </dl>

      {/* The two periods, stated as a commitment rather than as a citation.
          Somebody reading this has a complaint, not a research question. */}
      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
        We acknowledge every complaint within{" "}
        <strong className="text-foreground">
          {GRIEVANCE_ACKNOWLEDGEMENT_HOURS} hours
        </strong>{" "}
        with a ticket number, and resolve it within{" "}
        <strong className="text-foreground">
          {GRIEVANCE_RESOLUTION_DAYS} days
        </strong>{" "}
        of receipt. These are the shorter of the periods the two sets of Rules
        allow — see <code className="font-mono text-2xs">lib/legal.ts</code> for
        why we publish the shorter one.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Row({
  label,
  value,
  href,
  numeric,
}: {
  label: string;
  value: string;
  href?: string;
  numeric?: boolean;
}) {
  return (
    <div>
      <dt className="text-2xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </dt>
      <dd
        data-numeric={numeric || undefined}
        className="mt-0.5 text-sm leading-relaxed text-foreground"
      >
        {href ? (
          <a href={href} className="underline underline-offset-2">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

/**
 * What is shown before the details exist.
 *
 * Deliberately unmissable, and deliberately specific about what is missing —
 * "the entity details are not published" is a note somebody can act on;
 * omitting the section entirely is a compliance gap nobody can see.
 */
function NotYetPublished() {
  const missing = [
    !LEGAL_ENTITY.registeredName && "registered company name",
    !LEGAL_ENTITY.gstin && "GSTIN",
    !LEGAL_ENTITY.registeredAddress && "registered office address",
    !GRIEVANCE_OFFICER.name && "Grievance Officer's name",
    !GRIEVANCE_OFFICER.address && "Grievance Officer's address",
  ].filter(Boolean) as string[];

  return (
    <div
      role="note"
      className="not-prose rounded-2xl border border-warning-subtle-foreground/25 bg-warning-subtle p-6"
    >
      <p className="flex items-center gap-2 text-sm font-bold text-warning-subtle-foreground">
        <ShieldAlert aria-hidden className="size-4 flex-shrink-0" />
        Entity and grievance details are not yet published
      </p>

      <p className="mt-2 text-xs leading-relaxed text-warning-subtle-foreground">
        Indian law requires this page to name the company you are contracting
        with and the officer who handles complaints. Those details have not been
        filled in for this deployment, so they are not shown rather than shown
        wrongly. Until they are, write to{" "}
        <a
          href={`mailto:${GRIEVANCE_OFFICER.email}`}
          className="font-semibold underline underline-offset-2"
        >
          {GRIEVANCE_OFFICER.email}
        </a>{" "}
        and the same {GRIEVANCE_ACKNOWLEDGEMENT_HOURS}-hour acknowledgement and{" "}
        {GRIEVANCE_RESOLUTION_DAYS}-day resolution commitment applies.
      </p>

      <p className="mt-3 text-2xs leading-relaxed text-warning-subtle-foreground/85">
        Outstanding: {missing.join(", ")}. Fill them in at{" "}
        <code className="font-mono">src/lib/legal.ts</code>.
      </p>
    </div>
  );
}
