import Link from "next/link";
import { AlertTriangle, FileText, Users } from "lucide-react";

import { opsSignOutAction } from "@/app/actions/ops";
import { resolveCountry } from "@/lib/countryCatalogue";
import { requireStaff } from "@/lib/ops/dal";
import { ACTIVE_STATUSES, queue, statusCounts } from "@/lib/ops/queries";

/**
 * THE QUEUE.
 * ---------------------------------------------------------------------------
 * Ordered oldest-first, which is the opposite of most lists and is the point:
 * the application that has been waiting longest is the one somebody is chasing,
 * and a newest-first queue is one where the oldest item is never reached.
 */

const STATUS_LABEL: Record<string, string> = {
  submitted: "Awaiting check",
  received: "Checked",
  processing: "With consulate",
  decided: "Decided",
  closed: "Closed",
  withdrawn: "Withdrawn",
};

function waitingFor(since: number | null): string {
  if (!since) return "—";
  const hours = Math.floor((Date.now() - since) / (1000 * 60 * 60));
  if (hours < 1) return "under an hour";
  if (hours < 48) return `${hours} hours`;
  return `${Math.floor(hours / 24)} days`;
}

export default async function OpsQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; denied?: string }>;
}) {
  const staff = await requireStaff();
  const { status, denied } = await searchParams;

  const [rows, counts] = await Promise.all([queue({ status }), statusCounts()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
            Application queue
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {staff.name} · {staff.role}
          </p>
        </div>

        <form action={opsSignOutAction}>
          <button
            type="submit"
            className="text-xs font-bold text-primary underline-offset-2 hover:underline"
          >
            Sign out
          </button>
        </form>
      </header>

      {denied ? (
        <p
          role="alert"
          className="mb-6 flex items-start gap-2 rounded-md bg-destructive-subtle px-3.5 py-3 text-xs font-semibold text-destructive-subtle-foreground"
        >
          <AlertTriangle className="mt-px size-4 shrink-0" aria-hidden="true" />
          Your role does not allow that. Ask an administrator if you need it.
        </p>
      ) : null}

      {/* Filters are links, not client state. The queue is a page somebody
          keeps open and reloads; a filter in a URL survives that, and can be
          bookmarked and sent to a colleague. */}
      <nav className="mb-6 flex flex-wrap gap-2">
        <FilterLink label="Needs work" href="/ops" active={!status}>
          {ACTIVE_STATUSES.reduce((total, key) => total + (counts[key] ?? 0), 0)}
        </FilterLink>

        {Object.keys(STATUS_LABEL).map((key) => (
          <FilterLink
            key={key}
            label={STATUS_LABEL[key]}
            href={`/ops?status=${key}`}
            active={status === key}
          >
            {counts[key] ?? 0}
          </FilterLink>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="rounded-card border border-dashed border-border bg-surface px-6 py-12 text-center text-sm text-muted-foreground">
          Nothing here. {status ? "Try another filter." : "The queue is empty."}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/ops/applications/${row.id}`}
                className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-card border border-border bg-surface px-4 py-3.5 transition-colors hover:border-border-strong"
              >
                <span className="font-mono text-sm font-bold tabular-nums text-foreground">
                  {row.reference}
                </span>

                <span className="text-sm text-foreground">
                  {resolveCountry(row.countrySlug)?.name ?? row.countrySlug}
                </span>

                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="size-3.5" aria-hidden="true" />
                  {row.travellerCount}
                </span>

                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="size-3.5" aria-hidden="true" />
                  {row.documentCount}
                </span>

                {/* The only thing on this row that is a call to action. An
                    application with unreviewed documents is the reason to open
                    it, so it is the thing that stands out. */}
                {row.pendingDocuments > 0 ? (
                  <span className="rounded-sm bg-primary-subtle px-2 py-0.5 text-2xs font-bold text-primary-subtle-foreground">
                    {row.pendingDocuments} to review
                  </span>
                ) : null}

                <span className="ml-auto text-xs text-muted-foreground">
                  {STATUS_LABEL[row.status] ?? row.status} · waiting{" "}
                  {waitingFor(row.submittedAt ?? row.updatedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterLink({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-md bg-foreground px-3 py-1.5 text-xs font-bold text-surface"
          : "rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-border-strong"
      }
    >
      {label} <span className="tabular-nums opacity-60">{children}</span>
    </Link>
  );
}
