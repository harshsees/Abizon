import { notFound } from "next/navigation";

import { DocumentTracker } from "@/components/profile/DocumentTracker";
import type { DocumentProgressInput } from "@/lib/application/documentProgress";

/**
 * THE DOCUMENT TRACKING RECORD, IN EVERY STATE IT HAS.
 *
 * The tracker lives on the profile, behind a sign-in, against applications
 * belonging to a real applicant — so the only way to look at a rejection is to
 * reject somebody's passport, and the only way to look at a fully verified set
 * is to accept five. That makes the states nobody can reach the states nobody
 * has checked, which is how a screen ends up correct in the one case it was
 * built against and wrong in the four it was not.
 *
 * These are fixtures, not fetches: no database, no user, no application. It
 * 404s in production for the same reason `payment-preview` does — see that
 * file. The rule there applies here too: unreachable means the route does not
 * resolve, not that the path is hard to guess.
 */

const CASES: Array<{ title: string; note: string; documents: DocumentProgressInput[] }> = [
  {
    title: "Nothing yet",
    note: "An application in progress. The empty state has to read as 'not started', never as 'we lost them'.",
    documents: [],
  },
  {
    title: "Just uploaded",
    note: "Everything is in review. The bar is two thirds along, not full — the files arrived, nobody has looked.",
    documents: [
      doc("passport", "pending", 0),
      doc("photograph", "pending", 0),
      doc("panCard", "pending", 0),
    ],
  },
  {
    title: "Part way",
    note: "Some accepted, some still waiting. The rail is cumulative: a verified document was also uploaded.",
    documents: [
      doc("passport", "accepted", 0),
      doc("photograph", "accepted", 0),
      doc("panCard", "pending", 0),
      doc("returnTicket", "pending", 0),
    ],
  },
  {
    title: "One rejected",
    note: "The case the three-stage list has no room for. It leads, in the destructive colour, with the reviewer's reason — the only thing on this screen anybody has to act on.",
    documents: [
      doc("passport", "accepted", 0),
      doc("photograph", "accepted", 0),
      doc("panCard", "rejected", 0, "The number is not legible in the bottom right."),
      doc("hotelStay", "pending", 0),
    ],
  },
  {
    title: "All through",
    note: "A party of two. Positions rather than names, because the route does not serialise traveller names for a page that only draws progress.",
    documents: [
      doc("passport", "accepted", 0),
      doc("photograph", "accepted", 0),
      doc("passport", "accepted", 1),
      doc("photograph", "accepted", 1),
      doc("returnTicket", "accepted", 0),
    ],
  },
];

function doc(
  kind: string,
  status: string,
  travellerPosition: number,
  rejectionReason: string | null = null,
): DocumentProgressInput {
  return {
    kind,
    status,
    travellerPosition,
    rejectionReason,
    // Fixed rather than `Date.now()`: a preview whose timestamps move on every
    // reload is one where a screenshot taken to compare against cannot be.
    uploadedAt: Date.UTC(2026, 8, 2, 9, 14),
  };
}

export default function TrackerPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto max-w-2xl px-5 py-12 md:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Document tracker (dev)
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Every state the tracking record has, side by side. Fixtures — no
        database, no user, no application.
      </p>

      <div className="mt-10 space-y-12">
        {CASES.map((example) => (
          <section key={example.title}>
            <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground">
              {example.title}
            </h2>
            <p className="mt-1.5 mb-5 max-w-prose text-xs leading-relaxed text-muted-foreground">
              {example.note}
            </p>
            <div className="rounded-2xl border border-border bg-surface-sunken p-5">
              <DocumentTracker documents={example.documents} />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

export const metadata = {
  title: "Document tracker preview (dev)",
  robots: { index: false, follow: false },
};
