"use client";

/**
 * "Visa application made simple and reliable" — the comparison panel.
 *
 * The reference's version is a light rounded panel with a display-serif title
 * and a four-row table: a claim on the left, a green tick under the brand, a
 * red cross under "Others". The brand column is lifted on a white card so the
 * eye lands there first.
 *
 * TWO DEPARTURES FROM THE REFERENCE, both about what may be claimed.
 *
 * 1. The reference's rows include "Real-time tracking of your visa" and "100%
 *    digital process". Phase 8C deleted the first from the FAQ — there is no
 *    filing backend, so there is no status to track — and the second is false
 *    for sticker visas, where the applicant attends a mission. Neither is here.
 *    Every row below is something the shipped product actually does, and each
 *    names where: the guarantee, the fee breakdown, the document check.
 *
 * 2. The right column is headed "Doing it yourself", not "Others". Asserting
 *    that competitors lack these things is a claim about companies Abizon has
 *    not measured — the same class of unsupported comparative that Phase 8C
 *    spent its length removing. Comparing against the unaided process is both
 *    honest and the more useful comparison for someone deciding whether to use
 *    an agent at all.
 */

import { Check, X } from "lucide-react";

/** Each row states a capability and, in the tooltip-free way, where it lives. */
const ROWS: Array<{ claim: string; abizon: boolean; alone: boolean }> = [
  { claim: "A delivery date you see before you apply", abizon: true, alone: false },
  { claim: "Every fee itemised, including ours", abizon: true, alone: false },
  { claim: "Documents checked against the destination's rules", abizon: true, alone: false },
  { claim: "The fee waived if the date is missed", abizon: true, alone: false },
  { claim: "You pay the government fee directly", abizon: true, alone: true },
];

function Mark({ yes }: { yes: boolean }) {
  return (
    <span
      role="img"
      aria-label={yes ? "Yes" : "No"}
      className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full ${
        yes ? "bg-success text-white" : "bg-destructive-subtle text-destructive-subtle-foreground"
      }`}
    >
      {yes ? (
        <Check aria-hidden className="h-4 w-4" strokeWidth={3} />
      ) : (
        <X aria-hidden className="h-4 w-4" strokeWidth={3} />
      )}
    </span>
  );
}

export function VisaComparison() {
  return (
    // No top rule and no own max-width: the panel is a block inside the visa
    // process section now, not a section of its own in a hairline-ruled column.
    // It kept both, so on the rebuilt page it drew a stray full-width line
    // across the gap between the road and the panel.
    <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
      <div className="rounded-[28px] bg-surface-sunken px-4 py-12 md:px-10 md:py-16">
        <h2 className="type-h2 text-center text-balance text-foreground js-reveal-heading">
          Visa application made simple and reliable
        </h2>

        {/* A real table: five claims across two conditions is tabular data, and
            a screen reader should be able to say "A delivery date you see
            before you apply — abizon: Yes, Doing it yourself: No" rather than
            reading two disconnected columns of icons. */}
        <div className="mx-auto mt-9 max-w-3xl overflow-x-auto">
          <table className="w-full min-w-[420px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="w-1/2" />
                <th
                  scope="col"
                  className="rounded-t-2xl bg-surface px-4 py-4 text-center text-sm font-bold text-foreground"
                >
                  abizon
                </th>
                <th
                  scope="col"
                  className="px-4 py-4 text-center text-sm font-semibold text-muted-foreground"
                >
                  Doing it yourself
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr key={row.claim}>
                  <th
                    scope="row"
                    className="py-4 pr-4 text-left text-sm font-medium leading-snug text-foreground"
                  >
                    {row.claim}
                  </th>
                  {/* The lifted column. The white ground runs the height of the
                      table and rounds only at the ends, which is what makes it
                      read as one raised card rather than five stacked cells. */}
                  <td
                    className={`bg-surface px-4 py-4 text-center ${
                      i === ROWS.length - 1 ? "rounded-b-2xl" : ""
                    }`}
                  >
                    <Mark yes={row.abizon} />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <Mark yes={row.alone} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
