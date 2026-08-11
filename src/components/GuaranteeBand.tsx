"use client";

/**
 * The full-width black guarantee band.
 *
 * In the reference this is the one moment on the page that stops being a
 * document and makes a promise: a wide near-black slab, an alarm-clock mark, a
 * display-serif line stating the date the visa arrives with the date itself in
 * green, and one quiet line underneath. It sits between the documents section
 * and the process section — immediately after the reader learns what they must
 * provide, and immediately before they learn what happens next.
 *
 * WHAT IT SAYS, and what it deliberately does not.
 *
 * The reference prints a date *and a clock time* ("14th Aug, 3:53 am"). Keyrise
 * has no delivery-time source — `VisaGuarantee` has carried that distinction
 * since Phase 4, printing a time only when handed a real `guaranteedAt` and a
 * date alone otherwise. This band follows the same rule: today + `deliveryDays`
 * is arithmetic on a real SLA, an hour would be invention.
 *
 * The date is computed on the client, after mount, for a reason. Rendering it
 * during SSR bakes the build date into a statically-generated page, so a page
 * built on the 12th would still promise the 13th in September. Until it
 * resolves, the band states the guarantee without the date rather than
 * flashing a wrong one.
 */

import { AlarmClock } from "lucide-react";
import { useSyncExternalStore } from "react";

type GuaranteeBandProps = {
  countryName: string;
  /** The dataset's real SLA. */
  deliveryDays: number;
};

function formatGuaranteeDate(daysAhead: number): string {
  const due = new Date();
  due.setDate(due.getDate() + daysAhead);

  const day = due.getDate();
  const month = due.toLocaleDateString("en-IN", { month: "short" });
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";

  return `${day}${suffix} ${month}`;
}

/** The date never changes while the page is open, so nothing to subscribe to. */
const noSubscribe = () => () => {};

export function GuaranteeBand({ countryName, deliveryDays }: GuaranteeBandProps) {
  /**
   * `useSyncExternalStore` rather than an effect writing state: the server
   * snapshot is `null` (no date in the prerendered HTML, so the build date
   * cannot be baked into a static page) and the client snapshot is today's
   * date. React swaps them at hydration without a cascading render, which an
   * effect-plus-setState would cause — and which is the lint rule the rest of
   * this codebase is already carrying one violation of.
   */
  const dueDate = useSyncExternalStore(
    noSubscribe,
    () => formatGuaranteeDate(deliveryDays),
    () => null,
  );

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6 md:py-14">
      <div className="relative overflow-hidden rounded-[28px] bg-[#0B0B0D] px-6 py-14 text-center md:px-12 md:py-20">
        {/* A single soft light from above, so the slab has a source rather than
            being flat black. Matches the plate's logic in CountryImagePlate. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-1/3 left-1/2 h-2/3 w-2/3 -translate-x-1/2 rounded-full bg-white opacity-[0.06] blur-3xl"
        />

        <div className="relative">
          <AlarmClock
            aria-hidden
            className="mx-auto h-9 w-9 text-white"
            strokeWidth={1.5}
          />

          <p className="type-h2 mx-auto mt-6 max-w-3xl text-balance text-white">
            Get your {countryName} visa on or before{" "}
            {dueDate ? (
              <span className="text-[#5DE28E]">{dueDate}</span>
            ) : (
              <span className="text-[#5DE28E]">
                {deliveryDays} {deliveryDays === 1 ? "day" : "days"} from filing
              </span>
            )}
          </p>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/60 md:text-base">
            No ambiguity. You know when your visa arrives before you apply — and
            if we miss the date, the Keyrise fee is waived.
          </p>
        </div>
      </div>
    </section>
  );
}
