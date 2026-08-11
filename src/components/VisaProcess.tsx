/**
 * How a Keyrise application actually runs — four steps, in order.
 *
 * Rebuilt in Phase 4.1. What was removed and why:
 *
 *   - A nested "tracking" sub-timeline inside step 3, reading "Application has
 *     been sent to the immigration supervisor" and "Application has been sent to
 *     internal intelligence", each stamped "8 Jan, 5:45 AM" and badged ON TIME.
 *     Those are operational statuses for a specific application. Keyrise has no
 *     application backend producing them, and this is a public marketing page
 *     that no applicant is signed in to — so it was showing a stranger's
 *     progress, invented. Real application state belongs to the application
 *     journey, against a real record.
 *   - "Get Your Visa on 20 Jul, 01:08 PM" in the step 4 heading: a fixed date
 *     and a fixed clock time, unrelated to the country's `deliveryDays` and
 *     contradicting the guarantee the hero and the panel both print from real
 *     data. The step no longer states a date at all; `VisaGuarantee` is the one
 *     place a delivery date is quoted.
 *   - Three levels of nesting (card → card → card). The sequence is now carried
 *     by numerals, hairlines and whitespace.
 *
 * What survives is the fee logic, which is a real commitment stated elsewhere in
 * the product (pay-on-approval in `CountryApplicationPanel`, the waiver and
 * refund terms on /terms), not a statistic.
 */

const STEPS = [
  {
    num: "01",
    title: "Application",
    body: "You answer the questions and upload what the destination asks for. Only the government fee is payable at this point.",
  },
  {
    num: "02",
    title: "Document review",
    body: "Keyrise checks every document against the destination's requirements and comes back to you if anything needs replacing — before it is filed, not after.",
  },
  {
    num: "03",
    title: "Processing",
    body: "Your application is filed with the immigration authority and tracked until a decision is issued.",
  },
  {
    num: "04",
    title: "Visa",
    body: "The approved visa is sent to you by email. The Keyrise fee is charged only once it has been granted.",
  },
];

const OUTCOMES = [
  { case: "Your visa arrives on time", result: "You pay the Keyrise fee" },
  {
    case: "Your visa arrives even one second late",
    result: "The Keyrise fee is waived",
  },
  { case: "Your visa is refused", result: "The government fee is refunded" },
];

export function VisaProcess({ countryName }: { countryName?: string }) {
  return (
    <section
      id="process-section"
      className="scroll-mt-28 border-t border-border pt-10 md:pt-12"
    >
      <h2 className="text-2xl font-bold tracking-tight text-foreground js-reveal-heading">
        How it works
      </h2>

      <ol className="mt-6 divide-y divide-border border-t border-border">
        {STEPS.map((step) => (
          <li key={step.num} className="js-info-item flex gap-5 py-5 md:gap-8">
            <span
              data-numeric
              aria-hidden
              className="w-8 flex-shrink-0 text-sm font-bold tabular-nums text-muted-foreground/70"
            >
              {step.num}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {step.title}
              </p>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8">
        <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          What you pay, in each case
        </p>
        <dl className="mt-3 divide-y divide-border border-t border-border">
          {OUTCOMES.map((outcome) => (
            <div
              key={outcome.case}
              className="flex items-baseline justify-between gap-6 py-3"
            >
              <dt className="text-xs text-muted-foreground">{outcome.case}</dt>
              <dd className="shrink-0 text-xs font-semibold text-foreground">
                {outcome.result}
              </dd>
            </div>
          ))}
        </dl>
        {countryName && (
          <p className="mt-3 text-2xs text-muted-foreground">
            {/* `{" "}` is explicit: JSX drops the whitespace between an
                expression and the text that follows it across a line break,
                which rendered this as "a Dubaivisa is made by". */}
            The decision on a {countryName}{" "}
            visa is made by the destination&rsquo;s
            immigration authority. Keyrise guarantees the timing of the filing,
            not the outcome.
          </p>
        )}
      </div>
    </section>
  );
}
