import type { Metadata } from "next";

/**
 * THE OPS CONSOLE.
 * ---------------------------------------------------------------------------
 * The handover document calls this "the one most often forgotten until launch
 * week", and it is right: without it, an application can be submitted and there
 * is nowhere for anybody at Abizon to look at it. `lib/application/status.ts`
 * refuses to report any status past `ready` because nothing could observe one.
 * This is what observes them.
 *
 * ── Why it is in this application and not Retool ──
 *
 * Every passport scan and every applicant's details would flow through a third
 * party's servers. That is a DPDP question the client would have to answer about
 * a vendor they did not choose, on top of per-seat pricing forever. The queue
 * and the detail view are two pages.
 *
 * ── Deliberately plain ──
 *
 * No animation, no Lenis smooth scroll, no reveal-on-scroll. The public site is
 * a marketing site and is built to feel like one; this is a tool somebody uses
 * for six hours a day, where every millisecond of motion between clicking a row
 * and reading it is a cost. The visual language is shared (same tokens, same
 * components) and the pacing is not.
 */

export const metadata: Metadata = {
  title: "Ops | Abizon",
  // Nothing here is for the public and nothing here should ever be findable.
  // The header is belt and braces alongside `robots.txt` and the auth gate.
  robots: { index: false, follow: false, nocache: true },
};

/** Every page under here reads a session and per-staff data. A build-time
 *  render would produce one cached queue served to everybody. */
export const dynamic = "force-dynamic";

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-surface-sunken">{children}</div>;
}
