/**
 * Why Keyrise.
 *
 * The four claims below are not borrowed from a competitor — each one is a
 * commitment Keyrise already makes elsewhere in this codebase, restated in one
 * place:
 *
 *   on-time or free      the process section's "Keyrise fee is waived" row
 *   refund on rejection  the same section's "government fee is refunded" row
 *   checked before filed `VisaRequirements`' verification line
 *   fully digital        the e-visa "Paperless" method
 *
 * Nothing here asserts a statistic, a rating, or a volume, because none of
 * those exist as data.
 *
 * Phase 4.1 dropped the four bordered cards for a hairline list. Four boxed
 * panels inside a column that was itself a stack of boxed panels read as a
 * dashboard; the claims are short enough that type and rules carry them.
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
    title: "Refused? Government fee refunded",
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
    <section
      id="why-keyrise-section"
      className="scroll-mt-28 border-t border-border pt-10 md:pt-12"
    >
      <h2 className="text-2xl font-bold tracking-tight text-foreground js-reveal-heading">
        Why Keyrise
      </h2>

      <ul className="mt-6 divide-y divide-border border-t border-border">
        {POINTS.map((point) => (
          <li key={point.title} className="js-info-item flex gap-4 py-5">
            <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface-sunken text-subtle-foreground">
              <point.Icon aria-hidden className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{point.title}</p>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
                {point.body}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
