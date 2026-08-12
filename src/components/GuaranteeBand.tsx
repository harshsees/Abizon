"use client";

/**
 * The full-width black promise bands.
 *
 * The reference uses this slab twice, and the repetition is the point: it is
 * the one treatment on the page that stops being a document and makes a
 * promise, so it appears once at the end of Documents (screenshot 5) and once
 * at the end of Visa Process (screenshot 8). Both are the same object — a wide
 * near-black slab lit from above, a line mark, a display-serif sentence whose
 * payload word is green, and one quiet line underneath.
 *
 *   GuaranteeBand   closes Documents. States WHEN the visa arrives.
 *   NoChargeBand    closes Visa Process. States what happens if it does not.
 *
 * They were one component and one band before; `PromiseBand` is the shell they
 * now share, so the second one cannot drift from the first.
 *
 * WHAT THEY SAY, and what they deliberately do not.
 *
 * The reference prints a date *and a clock time* ("14th Aug, 12:01 pm").
 * Keyrise has no delivery-time source — `VisaGuarantee` has carried that
 * distinction since Phase 4, printing a time only when handed a real
 * `guaranteedAt` and a date alone otherwise. These follow the same rule: today
 * + `deliveryDays` is arithmetic on a real SLA, an hour would be invention.
 *
 * The date is computed on the client, after mount, for a reason. Rendering it
 * during SSR bakes the build date into a statically-generated page, so a page
 * built on the 12th would still promise the 13th in September. Until it
 * resolves, the band states the guarantee without the date rather than
 * flashing a wrong one.
 */

import { AlarmClock, ShieldCheck } from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";

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

/* -------------------------------------------------------------------------- */
/* The shared slab                                                            */
/* -------------------------------------------------------------------------- */

type PromiseBandProps = {
  icon: typeof AlarmClock;
  /** The display-serif sentence. Wrap the payload word in `<Accent>`. */
  children: ReactNode;
  caption: string;
};

export function PromiseBand({ icon: Icon, children, caption }: PromiseBandProps) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
      {/* Lit from the upper left rather than flat black, so the slab has a
          source. Matches the plate's logic in CountryImagePlate. */}
      <div className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(105deg,#33333A_0%,#141418_38%,#08080A_100%)] px-6 py-14 text-center md:px-12 md:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-1/3 left-1/3 h-2/3 w-2/3 -translate-x-1/2 rounded-full bg-white opacity-[0.05] blur-3xl"
        />

        <div className="relative">
          <Icon aria-hidden className="mx-auto h-9 w-9 text-white" strokeWidth={1.5} />

          <p className="type-h2 mx-auto mt-6 max-w-3xl text-balance text-white">
            {children}
          </p>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/60 md:text-base">
            {caption}
          </p>
        </div>
      </div>
    </div>
  );
}

/** The one green the bands use. Reserved for the word carrying the promise. */
function Accent({ children }: { children: ReactNode }) {
  return <span className="text-[#5DE28E]">{children}</span>;
}

/* -------------------------------------------------------------------------- */
/* The two instances                                                          */
/* -------------------------------------------------------------------------- */

export function GuaranteeBand({
  countryName,
  deliveryDays,
}: {
  countryName: string;
  /** The dataset's real SLA. */
  deliveryDays: number;
}) {
  /**
   * `useSyncExternalStore` rather than an effect writing state: the server
   * snapshot is `null` (no date in the prerendered HTML, so the build date
   * cannot be baked into a static page) and the client snapshot is today's
   * date. React swaps them at hydration without a cascading render, which an
   * effect-plus-setState would cause.
   */
  const dueDate = useSyncExternalStore(
    noSubscribe,
    () => formatGuaranteeDate(deliveryDays),
    () => null,
  );

  return (
    <PromiseBand
      icon={AlarmClock}
      caption="No ambiguity. You know when your visa arrives before you apply."
    >
      Get your {countryName} visa on or before{" "}
      <Accent>
        {dueDate ??
          `${deliveryDays} ${deliveryDays === 1 ? "day" : "days"} from filing`}
      </Accent>
    </PromiseBand>
  );
}

export function NoChargeBand() {
  return (
    <PromiseBand
      icon={ShieldCheck}
      caption="When we don't keep our promise, we don't expect anything back."
    >
      Visa not on time? <Accent>No charge.</Accent>
    </PromiseBand>
  );
}
