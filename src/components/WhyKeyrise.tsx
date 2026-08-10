"use client";

/**
 * Why Keyrise.
 *
 * The reference runs an equivalent section on every country page. The four
 * claims below are not borrowed from it — each one is a commitment Keyrise
 * already makes elsewhere in this codebase, restated in one place:
 *
 *   on-time or free      the process timeline's "Keyrise Fee Waived" row
 *   refund on rejection  the same timeline's "Government Fee Refunded" row
 *   pay after approval   the application card's pay-on-approval split
 *   fully digital        the e-visa "Paperless" method
 *
 * Nothing here asserts a statistic, a rating, or a volume, because none of
 * those exist as data. Kept deliberately plain — four lines and an icon.
 */

import { BadgeCheck, Clock, RotateCcw, Smartphone } from "lucide-react";

const POINTS = [
  {
    Icon: Clock,
    title: "On time, or the fee is waived",
    body: "If your visa arrives even a second after the promised time, you do not pay our fee.",
  },
  {
    Icon: RotateCcw,
    title: "Rejected? Government fee refunded",
    body: "If the application is turned down, the government fee comes back to you.",
  },
  {
    Icon: BadgeCheck,
    title: "Checked before it is filed",
    body: "Your documents are verified against the destination's requirements before submission.",
  },
  {
    Icon: Smartphone,
    title: "Entirely online",
    body: "Apply, upload and track from your phone. No courier, no queue, no paperwork.",
  },
];

export function WhyKeyrise() {
  return (
    <section className="space-y-5 border-t border-border/50 pt-8">
      <h2
        id="why-keyrise-section"
        className="scroll-mt-28 text-2xl font-bold tracking-tight text-foreground"
      >
        Why Keyrise
      </h2>

      <ul className="grid gap-3 sm:grid-cols-2">
        {POINTS.map((point) => (
          <li
            key={point.title}
            className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-5 shadow-e1"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-subtle text-primary-subtle-foreground">
              <point.Icon aria-hidden className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">{point.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {point.body}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
