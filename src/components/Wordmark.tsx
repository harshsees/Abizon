/**
 * The Abizon wordmark.
 *
 * It existed in five places — the site header, the application header, the
 * profile header and twice in the footer — as five hand-written spans reading
 * `abizon` in `font-black tracking-tighter`, in three different colours and
 * two different casings (one of them `uppercase`). A logo that is copy-pasted
 * is a logo that drifts, and it had: changing it meant finding all five.
 *
 * There is one now, and it owns the three things that make it a mark rather
 * than bold text:
 *
 *   face      Poppins, the geometric grotesque loaded in the root layout for
 *             this string and nothing else. Inter's neo-grotesque letterforms
 *             read as UI at any weight; the circular bowls are the point.
 *   casing    `abizon`. Lower case, written into the component so no caller can
 *             pass `Abizon` or bolt `uppercase` onto it again — which is what
 *             the five hand-written copies did, in two different casings.
 *
 *             It is lower case because the product owner asked for it twice:
 *             once as "keep the Letter in a small", which was read as a size
 *             instruction and acted on wrongly, and once unambiguously. The
 *             whole product surface follows — page copy, metadata, email
 *             templates and the legal pages — so the mark and the running text
 *             agree rather than the site spelling its own name two ways.
 *   colour    black, as a token. See `--color-wordmark`, which resolved to
 *             amber-600 until the mark was redrawn and is the foreground now.
 *
 * `tone` exists for the one place the mark is deliberately quiet — the footer's
 * legal bar, where it is a 12px credit beside a copyright line and full-strength
 * ink would make the smallest instance the loudest thing in the row. It changes
 * the colour and nothing else, so the face and the casing stay put.
 */

import { cn } from "@/lib/utils";

type WordmarkProps = {
  /** `brand` is the mark at full strength. `muted` is the footer credit. */
  tone?: "brand" | "muted";
  /** Size and any weight override. Everything else is fixed. */
  className?: string;
};

export function Wordmark({ tone = "brand", className }: WordmarkProps) {
  return (
    <span
      className={cn(
        // -0.03em is what closes Poppins' generous default sidebearings to the
        // tight fit of the reference mark. Inter needed `tracking-tighter`
        // (-0.05em) for the same look and lost its counters doing it.
        "font-wordmark text-xl font-bold leading-none tracking-[-0.03em]",
        tone === "brand" ? "text-wordmark" : "text-muted-foreground",
        className,
      )}
    >
      abizon
    </span>
  );
}
