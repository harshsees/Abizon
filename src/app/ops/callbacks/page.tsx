import Link from "next/link";
import { Mail, Phone } from "lucide-react";

import { resolveCountry } from "@/lib/countryCatalogue";
import { requireStaff } from "@/lib/ops/dal";
import { callbackQueue } from "@/lib/ops/queries";

/**
 * CALLBACK REQUESTS.
 * ---------------------------------------------------------------------------
 * Sticker-visa enquiries (Schengen, USA, Canada) from the country pages. The
 * visitor asked to be called; the phone number is a `tel:` link so the call is
 * one tap from a phone.
 */

function askedAgo(since: number): string {
  const minutes = Math.floor((Date.now() - since) / (1000 * 60));
  if (minutes < 60) return `${Math.max(1, minutes)} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} hours ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

export default async function OpsCallbacksPage() {
  const staff = await requireStaff();
  const rows = await callbackQueue();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
          Callback requests
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {staff.name} · {staff.role} ·{" "}
          <Link href="/ops" className="font-bold text-primary underline-offset-2 hover:underline">
            Application queue
          </Link>
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-card border border-dashed border-border bg-surface px-6 py-12 text-center text-sm text-muted-foreground">
          No callback requests yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-card border border-border bg-surface px-4 py-3.5"
            >
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <span className="text-sm font-bold text-foreground">{row.name}</span>
                <span className="text-sm text-foreground">
                  {resolveCountry(row.countrySlug)?.name ?? row.countrySlug}
                </span>
                <a
                  href={`tel:${row.phone.replace(/[^+0-9]/g, "")}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                >
                  <Phone className="size-3.5" aria-hidden="true" />
                  {row.phone}
                </a>
                {row.email ? (
                  <a
                    href={`mailto:${row.email}`}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:underline"
                  >
                    <Mail className="size-3.5" aria-hidden="true" />
                    {row.email}
                  </a>
                ) : null}
                <span className="ml-auto text-xs text-muted-foreground">
                  {askedAgo(row.createdAt)}
                </span>
              </div>
              {row.travelPlan || row.message ? (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {row.travelPlan ? <>Travelling: {row.travelPlan}. </> : null}
                  {row.message}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
