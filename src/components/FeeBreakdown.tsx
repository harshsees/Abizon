"use client";

/**
 * The government fee breakdown — now a drawer inside the application card.
 *
 * It used to be a section of its own in the information column, permanently
 * open, restating every figure the card beside it was already showing. Two
 * surfaces printing the same three numbers is not transparency, it is noise:
 * the reader has to check them against each other to be sure they agree.
 *
 * So it moved into the card and closed. Collapsed, it is one quiet sunken row
 * that says the itemisation exists; opened, it prints the same three lines it
 * always did. Nothing was removed — the disclosure was.
 *
 * It owns no money of its own. `totals` and `travellers` are handed down from
 * `CountryApplicationPanel`, so the drawer cannot drift from the price above it
 * the way the old standalone section could (and once did, by ₹1,270).
 */

import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Info, Landmark, ReceiptText, ShieldCheck } from "lucide-react";

import type { computeTotals } from "@/lib/countryVisa";
import { FEE_NOT_PUBLISHED } from "@/lib/pricingConfig";
import { DURATION, EASE } from "@/lib/motion";

const inr = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

/** PHASE 8C: a fee Abizon has not decided prints as words, never as a number. */
const inrOrUnset = (value: number | null) =>
  value === null ? FEE_NOT_PUBLISHED : inr(value);

type Totals = ReturnType<typeof computeTotals>;

type GovFeeBreakdownProps = {
  /** Only used in the government-fee hint, so the display name is right here. */
  countryName: string;
  travellers: number;
  totals: Totals;
};

export function GovFeeBreakdown({
  countryName,
  travellers,
  totals,
}: GovFeeBreakdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  const rows = [
    {
      icon: Landmark,
      label: "Government fee",
      hint: `Paid directly to the ${countryName} immigration authority.`,
      amount: totals.governmentFee,
      free: totals.governmentFee === 0,
    },
    {
      icon: ShieldCheck,
      label: "Abizon service fee",
      // The hint carries the status. A traveller reading a fee table is
      // entitled to know which of these numbers is settled and which is not,
      // and the distinction disappears from here on its own the moment
      // `ABIZON_TERMS.status` becomes "verified".
      hint: totals.provisional
        ? "Document checks, filing and the on-time guarantee. Provisional, not yet confirmed."
        : "Document checks, filing and the on-time guarantee.",
      amount: totals.serviceFee,
      free: false,
    },
    {
      icon: ReceiptText,
      label: "GST (18%)",
      hint: "Charged on the service fee only, as required by Indian law.",
      amount: totals.gst,
      free: false,
    },
  ];

  const total =
    totals.perTraveller === null ? null : totals.perTraveller * travellers;

  return (
    <div className="mt-6 overflow-hidden rounded-2xl bg-surface-sunken">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors duration-[--duration-fast] hover:bg-surface-sunken/60"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface text-subtle-foreground shadow-e1">
            <ReceiptText aria-hidden className="h-4 w-4" strokeWidth={1.7} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground">
              Gov. fee breakdown
            </span>
            <span className="block text-2xs text-muted-foreground">
              Every rupee itemised, including ours
            </span>
          </span>
        </span>

        {/* Rotation only — the chevron is the affordance, so it should turn
            rather than swap for an up-chevron the eye has to re-read. */}
        <motion.span
          aria-hidden
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: DURATION.base, ease: EASE.out }}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground"
        >
          <ChevronDown className="h-4 w-4" strokeWidth={1.8} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={panelId}
            key="fee-detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DURATION.slow, ease: EASE.out }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <ul className="divide-y divide-border border-t border-border">
                {rows.map((row) => (
                  <li
                    key={row.label}
                    className="flex items-start justify-between gap-3 py-3.5"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <row.icon
                        aria-hidden
                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground"
                        strokeWidth={1.6}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">
                          {row.label}
                        </p>
                        <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">
                          {row.hint}
                        </p>
                      </div>
                    </div>
                    <span
                      data-numeric
                      className={`shrink-0 text-xs font-semibold ${
                        row.free
                          ? "text-success-subtle-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {row.free ? "Free" : inrOrUnset(row.amount)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex items-end justify-between gap-4 border-t border-border-strong pt-3.5">
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Total payable
                  </p>
                  <p className="mt-0.5 text-2xs text-muted-foreground">
                    {inrOrUnset(totals.perTraveller)} × {travellers}{" "}
                    {travellers === 1 ? "traveller" : "travellers"}
                  </p>
                </div>
                <span
                  data-numeric
                  className={
                    total === null
                      ? "text-xs font-semibold text-muted-foreground"
                      : "text-lg font-bold tracking-tight text-foreground"
                  }
                >
                  {inrOrUnset(total)}
                </span>
              </div>

              <p className="mt-3 flex items-start gap-2 text-2xs leading-relaxed text-muted-foreground">
                <Info aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Government fees are set by the {countryName} authorities and
                  can change without notice. If the fee drops between payment
                  and filing, Abizon refunds the difference automatically.
                </span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
