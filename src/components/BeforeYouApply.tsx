/**
 * What a visa decision turns on.
 *
 * Replaces `ApprovalChances`, which was a six-question quiz that ended on a
 * percentage — "100%" on the promo gauge, then a computed 1-99% on the result
 * screen. The maths behind it was a hand-tuned score (`75` as a base, `-45` for
 * an overstay, `-60` for a conviction), not a model trained on outcomes, and
 * Keyrise has no approval data to train one on. A number in that position is
 * read as a prediction, and a traveller can book flights on it.
 *
 * The questions themselves were the useful part: they are the factors any
 * consulate actually weighs. They survive here as plain statements of what
 * matters, with no score attached and no attempt to weight them. This section
 * asserts nothing Keyrise cannot stand behind.
 *
 * There is deliberately no "estimate", "likelihood" or "score" here. If a real
 * outcome dataset ever exists, that is a new component with a source, not a
 * percentage bolted back onto this one.
 */

import { Ban, CalendarClock, Landmark, Wallet } from "lucide-react";

const FACTORS = [
  {
    Icon: CalendarClock,
    title: "Passport validity",
    body: "Most destinations require at least six months of validity beyond your travel date. This is the single most common reason an otherwise complete application is returned.",
  },
  {
    Icon: Ban,
    title: "Immigration history",
    body: "A previous overstay, refusal or deportation is visible to the authority deciding your case, and must be declared. So must any criminal conviction.",
  },
  {
    Icon: Wallet,
    title: "Means to support the trip",
    body: "Some authorities ask for bank statements, a return ticket or accommodation details. Keyrise tells you before filing if your destination wants them.",
  },
  {
    Icon: Landmark,
    title: "The authority decides, not us",
    body: "Keyrise prepares and files your application. The grant or refusal is made by the destination's immigration authority, on its own criteria.",
  },
];

export function BeforeYouApply() {
  return (
    <section
      id="before-you-apply"
      className="scroll-mt-28 border-t border-border pt-10 md:pt-12"
    >
      <h2 className="text-2xl font-bold tracking-tight text-foreground js-reveal-heading">
        What a decision turns on
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        We do not publish an approval score, because we have no honest way to
        calculate one. These are the things that actually affect the outcome.
      </p>

      <ul className="mt-6 divide-y divide-border border-t border-border">
        {FACTORS.map((factor) => (
          <li key={factor.title} className="js-info-item flex gap-4 py-5">
            <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface-sunken text-subtle-foreground">
              <factor.Icon aria-hidden className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {factor.title}
              </p>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
                {factor.body}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
