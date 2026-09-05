import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileSearch, UserRound } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/dal";

/**
 * /track — the way in to `/track/<reference>`.
 *
 * ── Why this page did not exist and now has to ──
 *
 * `/track/<reference>` has always been the tracking page, and it is reachable
 * only if you already hold a reference and know to put it in the address bar.
 * The header now carries a tracking control, and a control has to point
 * somewhere; pointing it at `/profile` would make it a second account button,
 * and pointing it at `/track/` alone was a 404.
 *
 * ── Two audiences, and they need opposite things ──
 *
 * Someone signed in has their applications listed, with each one's documents
 * and where they have got to, on their profile. They should be sent there
 * rather than asked to type a reference they would have to go and find.
 *
 * Someone not signed in is usually reading the reference off a message, on a
 * phone that is not theirs, and being asked to sign in is being asked for a
 * one-time code they may not be able to receive. That is why the reference
 * page is public in the first place — see `lookupApplicationStatus` — and why
 * this page offers the field to them without a wall in front of it.
 *
 * So the redirect is not a shortcut, it is the answer for one of the two.
 *
 * ── A GET form, deliberately ──
 *
 * No client component, no `useRouter`, no state. The field submits to this
 * route with `?reference=`, and the server redirects. It works with JavaScript
 * off, it is one round trip, and it puts the reference in the URL — which is
 * where somebody will look for it when they want to send the link on.
 *
 * The reference is uppercased and stripped here rather than validated: whether
 * it exists is `lookupApplicationStatus`'s question, and it already
 * distinguishes "not a reference", "no such application" and "we could not
 * look" in three different sentences. Rejecting a malformed one here would
 * produce a fourth, worse version of the same message.
 */

export const metadata: Metadata = {
  title: "Track an application | abizon",
  description:
    "Follow a abizon visa application by its reference, or open your own applications.",
};

export default async function TrackIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;

  const cleaned = reference?.trim().toUpperCase();
  if (cleaned) redirect(`/track/${encodeURIComponent(cleaned)}`);

  const user = await getCurrentUser();

  return (
    <main id="main-content" tabIndex={-1} className="flex-1 bg-background">
      <section className="mx-auto max-w-lg px-5 py-16 md:px-6 md:py-24">
        <span
          aria-hidden
          className="flex size-11 items-center justify-center rounded-xl bg-primary-subtle text-primary-subtle-foreground"
        >
          <FileSearch className="size-5" />
        </span>

        <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Track an application
        </h1>
        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
          Enter the reference we sent you. It looks like{" "}
          <span data-numeric className="font-semibold text-foreground">
            ABZ-4K7P-2QRT
          </span>
          .
        </p>

        <form action="/track" method="get" className="mt-7 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="reference">
            Application reference
          </label>
          <input
            id="reference"
            name="reference"
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="ABZ-0000-0000"
            data-numeric
            className="h-12 min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 text-base uppercase tracking-[0.06em] text-foreground placeholder:text-muted-foreground/70 focus:border-border-strong focus:outline-2 focus:outline-offset-2 focus:outline-ring"
          />
          <button
            type="submit"
            className="inline-flex h-12 cursor-pointer items-center justify-center rounded-xl bg-foreground px-6 text-sm font-bold text-background transition-colors hover:bg-subtle-foreground"
          >
            Track
          </button>
        </form>

        {/* The other audience. A signed-in applicant should not be typing a
            reference at all — their applications, and every document on them,
            are listed with their progress on the profile. */}
        <div className="mt-10 rounded-2xl border border-border bg-surface p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-foreground">
            <UserRound aria-hidden className="size-4 text-muted-foreground" />
            {user ? "Your applications" : "Applied with an account?"}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {user
              ? "Everything you have started is on your profile, with each document and how far it has been checked."
              : "Sign in and every application you have started is listed, with each document and how far it has been checked — no reference needed."}
          </p>
          <Link
            href={user ? "/profile" : "/login?next=%2Fprofile"}
            className="mt-3.5 inline-flex items-center rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-on-primary transition-colors hover:bg-primary-hover"
          >
            {user ? "Open your profile" : "Sign in"}
          </Link>
        </div>
      </section>
    </main>
  );
}
