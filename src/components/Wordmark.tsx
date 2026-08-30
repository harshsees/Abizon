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
 *   casing    `Abizon`. Title case, written into the component so no caller
 *             can pass `abizon` or bolt `uppercase` onto it again.
 *   colour    the brand yellow, as a token. See `--color-wordmark`.
 *
 * `tone` exists for the one place the mark is deliberately quiet — the footer's
 * legal bar, where it is a 12px credit next to a copyright line and painting it
 * brand yellow would make the smallest instance the loudest. It changes the
 * colour and nothing else, so the face and the casing stay put.
 */

import { cn } from "@/lib/utils";

type WordmarkProps = {
  /** `brand` is the yellow mark. `muted` is the footer credit. */
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
      Abizon
    </span>
  );
}
