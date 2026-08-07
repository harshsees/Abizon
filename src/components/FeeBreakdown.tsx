"use client";

/**
 * Government fee breakdown.
 *
 * Atlys exposes this as its own tab on every country page ("Gov. Fee
 * Breakdown") rather than burying the maths in a tooltip — the whole pitch is
 * that you can see exactly which rupee goes to the embassy and which goes to
 * them. Reproducing that means showing the split as line items, not a total.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, Landmark, Minus, Plus, ReceiptText, ShieldCheck } from "lucide-react";

import { Country } from "@/data/countries";
import { DURATION, EASE } from "@/lib/motion";

/** Flat per-applicant handling charge, matching the ApplicationCard pricing. */
const SERVICE_FEE = 1499;
/** GST applies to the service component only — never to the embassy's fee. */
const GST_RATE = 0.18;

const inr = (value: number) =>
  `₹${Math.round(value).toLocaleString("en-IN")}`;

/** Country fees are authored as display strings ("₹8,099", "Free"). */
function parseGovernmentFee(fees: string): number {
  if (/free/i.test(fees)) return 0;
  const digits = fees.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

type FeeBreakdownProps = {
  country: Country;
  className?: string;
};

export function FeeBreakdown({ country, className = "" }: FeeBreakdownProps) {
  const [travellers, setTravellers] = useState(1);

  const governmentFee = parseGovernmentFee(country.fees);
  const gst = SERVICE_FEE * GST_RATE;
  const perTraveller = governmentFee + SERVICE_FEE + gst;
  const total = perTraveller * travellers;

  const rows = [
    {
      icon: Landmark,
      label: "Government fee",
      hint: `Paid directly to the ${country.name} immigration authority.`,
      amount: governmentFee,
      free: governmentFee === 0,
    },
    {
      icon: ShieldCheck,
      label: "Keyrise service fee",
      hint: "Document checks, application filing and on-time guarantee.",
      amount: SERVICE_FEE,
      free: false,
    },
    {
      icon: ReceiptText,
      label: "GST (18%)",
      hint: "Charged on the service fee only, as required by Indian law.",
      amount: gst,
      free: false,
    },
  ];

  return (
    <section
      id="fees-section"
      className={`scroll-mt-28 rounded-2xl border border-border bg-surface p-5 shadow-e2 md:p-6 ${className}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground js-reveal-heading">
            Gov. fee breakdown
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every rupee itemised. No charge appears at checkout that isn&apos;t listed here.
          </p>
        </div>

        {/* Traveller stepper — the total is the number people actually pay,
            so it has to react to party size the way the checkout does. */}
        <div className="flex items-center gap-1 rounded-full border border-border bg-surface-sunken p-1">
          <button
            type="button"
            onClick={() => setTravellers((n) => Math.max(1, n - 1))}
            disabled={travellers === 1}
            aria-label="Remove a traveller"
            className="flex h-8 w-8 items-center justify-center rounded-full text-subtle-foreground transition hover:bg-surface disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span
            data-numeric
            className="min-w-14 text-center text-sm font-bold text-foreground"
          >
            {travellers} {travellers === 1 ? "adult" : "adults"}
          </span>
          <button
            type="button"
            onClick={() => setTravellers((n) => Math.min(10, n + 1))}
            disabled={travellers === 10}
            aria-label="Add a traveller"
            className="flex h-8 w-8 items-center justify-center rounded-full text-subtle-foreground transition hover:bg-surface disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </header>

      <ul className="mt-6 divide-y divide-border">
        {rows.map((row) => (
          <li
            key={row.label}
            className="js-info-item flex items-start justify-between gap-4 py-4"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-muted-foreground">
                <row.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{row.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{row.hint}</p>
              </div>
            </div>
            <span
              data-numeric
              className={`shrink-0 text-sm font-bold ${
                row.free ? "text-success-subtle-foreground" : "text-foreground"
              }`}
            >
              {row.free ? "Free" : inr(row.amount)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-end justify-between gap-4 rounded-xl bg-surface-sunken px-4 py-4">
        <div>
          <p className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">
            Total payable
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {inr(perTraveller)} × {travellers} {travellers === 1 ? "traveller" : "travellers"}
          </p>
        </div>
        {/* Keyed on the value so the figure cross-fades when the stepper moves,
            rather than snapping — the only thing on the card that changes. */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={total}
            data-numeric
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: DURATION.fast, ease: EASE.out }}
            className="text-2xl font-black tracking-tight text-foreground"
          >
            {inr(total)}
          </motion.span>
        </AnimatePresence>
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Government fees are set by the {country.name} authorities and can change without
          notice. If the fee drops between payment and filing, Keyrise refunds the difference
          automatically.
        </span>
      </p>
    </section>
  );
}
