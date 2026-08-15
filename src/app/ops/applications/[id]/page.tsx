import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { DocumentReview } from "@/components/ops/DocumentReview";
import { StatusControl } from "@/components/ops/StatusControl";
import { resolveCountry } from "@/lib/countryCatalogue";
import { requireStaff } from "@/lib/ops/dal";
import { applicationForOps } from "@/lib/ops/queries";

/**
 * ONE APPLICATION.
 * ---------------------------------------------------------------------------
 * Rendering this page decrypts every passport number on it, so
 * `applicationForOps` writes a `traveller.decrypted` audit row before returning.
 * That is the entire remaining control on misuse by someone who is *supposed*
 * to have access — encryption stops a database dump being useful and does
 * nothing about a person with a legitimate login, because the system decrypts
 * for them by design.
 */

const NEXT_STATUSES: Record<
  string,
  Array<{ value: string; label: string; description: string }>
> = {
  submitted: [
    {
      value: "received",
      label: "Checked",
      description: "Documents reviewed and accepted. The applicant is emailed.",
    },
    {
      value: "withdrawn",
      label: "Withdrawn",
      description: "The applicant asked to stop. No email is sent.",
    },
  ],
  received: [
    {
      value: "processing",
      label: "With consulate",
      description: "Filed. The applicant is told processing has begun.",
    },
    { value: "withdrawn", label: "Withdrawn", description: "The applicant asked to stop." },
  ],
  processing: [
    {
      value: "decided",
      label: "Decided",
      description: "The consulate has ruled. The applicant is told to sign in.",
    },
    { value: "withdrawn", label: "Withdrawn", description: "The applicant asked to stop." },
  ],
  decided: [
    {
      value: "closed",
      label: "Closed",
      description: "Nothing further to do. Starts the retention clock on the documents.",
    },
  ],
};

export default async function OpsApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requireStaff();
  const { id } = await params;

  const application = await applicationForOps(staff, id);
  if (!application) notFound();

  const travellerName = (travellerId: string) =>
    application.travellers.find((traveller) => traveller.id === travellerId)?.fullName ??
    "Unnamed traveller";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href="/ops"
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-primary underline-offset-2 hover:underline"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Back to the queue
      </Link>

      <header className="mb-8">
        <h1 className="font-mono text-2xl font-bold tabular-nums tracking-tight text-foreground">
          {application.reference}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {resolveCountry(application.countrySlug)?.name ?? application.countrySlug} ·{" "}
          {application.status} · applicant {application.applicantPhone}
        </p>
      </header>

      {/* --- Travellers ---------------------------------------------------- */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Travellers
        </h2>

        <div className="space-y-3">
          {application.travellers.map((traveller) => (
            <div
              key={traveller.id}
              className="rounded-card border border-border bg-surface p-4"
            >
              <p className="text-sm font-bold text-foreground">
                {traveller.fullName ?? "Not yet given"}
              </p>

              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-3">
                <Detail label="Passport" value={traveller.passportNumber} mono />
                <Detail label="Date of birth" value={traveller.dateOfBirth} />
                <Detail label="Expires" value={traveller.passportExpiry} />
                <Detail label="Nationality" value={traveller.nationality} />
                <Detail label="Gender" value={traveller.gender} />
                <Detail label="Email" value={traveller.email} />
              </dl>
            </div>
          ))}
        </div>
      </section>

      {/* --- Documents ----------------------------------------------------- */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Documents
        </h2>

        {application.documents.length === 0 ? (
          <p className="rounded-card border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-muted-foreground">
            Nothing uploaded.
          </p>
        ) : (
          <div className="space-y-3">
            {application.documents.map((document) => (
              <DocumentReview
                key={document.id}
                document={document}
                applicationId={application.id}
                travellerName={travellerName(document.travellerId)}
                // `viewer` can look; only `processor` and above can decide.
                canReview={staff.role !== "viewer"}
              />
            ))}
          </div>
        )}
      </section>

      {/* --- Status -------------------------------------------------------- */}
      {staff.role !== "viewer" ? (
        <section className="mb-8 rounded-card border border-border bg-surface p-5">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Status
          </h2>
          <StatusControl
            applicationId={application.id}
            current={application.status}
            options={NEXT_STATUSES[application.status] ?? []}
          />
        </section>
      ) : null}

      {/* --- History ------------------------------------------------------- */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          History
        </h2>

        <ol className="space-y-2">
          {application.events.map((event, index) => (
            <li
              key={`${event.at}-${index}`}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-md border border-border bg-surface px-4 py-2.5 text-xs"
            >
              <span className="font-bold text-foreground">{event.status}</span>
              <span className="text-muted-foreground">by {event.actorType}</span>
              <span className="ml-auto tabular-nums text-muted-foreground">
                {new Date(event.at).toLocaleString("en-GB")}
              </span>
              {event.note ? (
                <span className="w-full text-muted-foreground">“{event.note}”</span>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono font-semibold text-foreground" : "text-foreground"}>
        {value ?? "—"}
      </dd>
    </div>
  );
}
