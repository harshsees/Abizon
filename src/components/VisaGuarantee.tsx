"use client";

/**
 * The delivery guarantee.
 *
 * Three tiers, chosen by how much the caller actually knows. The tiers exist so
 * that no caller is ever forced to invent the missing precision:
 *
 *   1. `guaranteedAt`  a real timestamp from a real commitment. Renders the
 *                      date AND the time — "on or before 12 Aug, 4:05 pm".
 *   2. `deliveryDays`  the dataset's SLA in days. Renders a date derived from
 *                      it, and NO time. Today + n days is arithmetic on real
 *                      data; "4:05 pm" would be a number nobody has.
 *   3. neither         a plain, undated promise.
 *
 * The reference pairs its guarantee with a precise clock time. Abizon cannot
 * honestly print one yet, so tier 2 prints the date alone rather than padding
 * it with a plausible-looking hour. When a real delivery-time source exists,
 * pass `guaranteedAt` and the component upgrades itself.
 */

import { ShieldCheck } from "lucide-react";

type VisaGuaranteeProps = {
  /** A real committed delivery moment, when one exists. */
  guaranteedAt?: Date;
  /** The dataset's SLA. Used only to derive a date, never a time. */
  deliveryDays?: number;
  countryName?: string;
  /** Overrides the generated sentence entirely. */
  message?: string;
  tone?: "onDark" | "onLight";
  className?: string;
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatTime(date: Date): string {
  return date
    .toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
    .toLowerCase();
}

export function VisaGuarantee({
  guaranteedAt,
  deliveryDays,
  countryName,
  message,
  tone = "onDark",
  className = "",
}: VisaGuaranteeProps) {
  const label = (() => {
    if (message) return message;

    // Tier 1 — a real commitment: date and time.
    if (guaranteedAt) {
      return `Get your visa on or before ${formatDate(guaranteedAt)}, ${formatTime(guaranteedAt)}`;
    }

    // Tier 2 — derived from the SLA: date only.
    if (typeof deliveryDays === "number") {
      const due = new Date();
      due.setDate(due.getDate() + deliveryDays);
      return `Get your ${countryName ?? ""} visa on or before ${formatDate(due)}`.replace(
        /\s+/g,
        " ",
      );
    }

    // Tier 3 — no timing data at all.
    return "Visas on time, guaranteed";
  })();

  const onDark = tone === "onDark";

  return (
    <div
      className={[
        "inline-flex items-center gap-2.5 rounded-full border px-4 py-2.5",
        onDark
          ? "border-white/15 bg-white/10 text-white backdrop-blur"
          : "border-border bg-surface text-foreground shadow-e1",
        className,
      ].join(" ")}
    >
      <ShieldCheck
        aria-hidden
        className={onDark ? "h-4.5 w-4.5 text-emerald-300" : "h-4.5 w-4.5 text-success"}
      />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
