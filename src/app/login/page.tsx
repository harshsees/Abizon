import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { smsDeliveryNotice } from "@/app/actions/auth";
import { BrandLogo } from "@/components/BrandLogo";
import { LoginCard } from "@/components/auth/LoginCard";
import { getCurrentUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Sign in | abizon",
  description:
    "Sign in to abizon with your mobile number to start, resume or track a visa application.",
  // A login screen has nothing to index and appearing in search results for it
  // only ever helps a phishing lookalike rank alongside the real one.
  robots: { index: false, follow: false },
};

/**
 * THE LOGIN ROUTE.
 * ---------------------------------------------------------------------------
 * Deliberately standalone: no site header, no footer, no navigation. A visitor
 * on this page has exactly one job, and every link away from it is a way to
 * fail at that job. The only way out is the wordmark, which goes home.
 *
 * `?next=` carries where they were headed before being asked to sign in. It is
 * validated server-side in the action, not here — this page only passes it
 * along, and a value that survives to the redirect is checked there.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Already signed in — there is nothing to do here.
  const user = await getCurrentUser();
  if (user) redirect("/profile");

  const [{ next }, delivery] = await Promise.all([searchParams, smsDeliveryNotice()]);

  return (
    <div className="flex min-h-dvh flex-col bg-surface-sunken">
      <header className="px-4 py-5 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center"
          aria-label="abizon home"
        >
          {/* This was the last hand-written wordmark in the codebase — a
              `font-black tracking-tighter` span reading `abizon`, lower case,
              in the foreground colour. Three drifts from the mark in one
              element. */}
          <BrandLogo size="md" />
        </Link>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12"
      >
        <LoginCard next={next} delivery={delivery} />
      </main>

      <footer className="px-4 py-6 text-center sm:px-6">
        <p className="text-2xs text-muted-foreground">
          Trouble signing in?{" "}
          <Link
            href="/contact"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            Contact support
          </Link>
        </p>
      </footer>
    </div>
  );
}
