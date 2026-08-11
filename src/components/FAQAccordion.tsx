"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

import { DURATION, EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The processing-time answer used to read "Standard processing takes 3-5
 * working days. Express applications can be processed in 24-48 hours." Those
 * were fixed numbers rendered identically on all ~154 country pages, and on
 * Dubai they contradicted the page's own guarantee three sections above it —
 * the dataset's `deliveryDays` for the UAE is 1. The answer now interpolates
 * `{delivery}` from that real field, and the generic fallback states the
 * guarantee rather than a duration.
 *
 * The tracking answer no longer promises "real-time status updates through your
 * dashboard": there is no application backend behind it yet.
 */
const faqs = [
  {
    q: "Do Indians need a visa for Dubai?",
    a: "Yes, Indian passport holders need a valid UAE visa before travel unless covered by a qualifying visa-on-arrival policy.",
  },
  {
    q: "How long does Dubai visa processing take?",
    a: "{delivery} Choosing Express adds priority handling, and a faster date where the destination offers one.",
  },
  {
    q: "What documents are required?",
    a: "A valid passport scan, recent photograph, travel dates, and additional booking documents depending on visa type.",
  },
  {
    q: "Can I apply without confirmed flight tickets?",
    a: "Yes, for many cases you can start your application first. Our team will tell you if a confirmed return ticket is required.",
  },
  {
    q: "Is my passport data secure?",
    a: "All uploads are encrypted in transit and storage. Access is restricted to verified processing specialists.",
  },
  {
    q: "Can I track my application?",
    a: "Yes. You are notified by email as your application moves through document review, filing and decision.",
  },
  {
    q: "What happens if my visa is delayed?",
    a: "If delay is due to our processing miss, we offer support under our on-time delivery guarantee terms.",
  },
  {
    q: "Can I apply for family members?",
    a: "Yes, you can submit applications for multiple travelers in one checkout flow.",
  },
];

export function FAQAccordion({
  className,
  countryName = "Dubai",
  /** The dataset's guaranteed delivery, in days. Omitted where unknown. */
  deliveryDays,
}: {
  className?: string;
  countryName?: string;
  deliveryDays?: number;
}) {
  const [open, setOpen] = useState<number | null>(0);
  const reduced = useReducedMotion();
  const baseId = useId();

  const deliveryAnswer =
    typeof deliveryDays === "number"
      ? `Keyrise guarantees your ${countryName} visa within ${deliveryDays} ${
          deliveryDays === 1 ? "day" : "days"
        } of a complete application, or our fee is waived.`
      : `Keyrise guarantees your ${countryName} visa by the date shown on your application, or our fee is waived.`;

  const formattedFaqs = faqs.map((faq) => {
    return {
      q: faq.q.replace(/Dubai/g, countryName).replace(/UAE/g, countryName),
      a: faq.a
        .replace("{delivery}", deliveryAnswer)
        .replace(/Dubai/g, countryName)
        .replace(/UAE/g, countryName),
    };
  });

  return (
    <section id="faq" className={`${className || "mx-auto w-full max-w-4xl px-4 py-14 md:px-6"} scroll-mt-20`}>
      <h2 className="text-3xl font-bold text-foreground">FAQs</h2>
      <div className="mt-6 space-y-3">
        {formattedFaqs.map((item, index) => {
          const isOpen = open === index;
          const panelId = `${baseId}-panel-${index}`;
          const triggerId = `${baseId}-trigger-${index}`;

          return (
            <article
              key={item.q}
              className={cn(
                "rounded-lg border bg-surface p-4",
                "transition-[border-color,box-shadow] duration-[--duration-base] ease-[--ease-out]",
                isOpen
                  ? "border-primary-border shadow-e2"
                  : "border-border hover:border-border-strong",
              )}
            >
              <button
                type="button"
                id={triggerId}
                onClick={() => setOpen(isOpen ? null : index)}
                // min-h-11 keeps the row at the 44px touch minimum; the text
                // alone collapsed the trigger to 22px on mobile.
                className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-4 text-left"
                aria-expanded={isOpen}
                aria-controls={panelId}
              >
                <span className="text-sm font-semibold text-foreground md:text-base">
                  {item.q}
                </span>
                {/* Rotation is driven by Framer rather than a CSS class so it
                    shares the panel's easing — the two used to disagree, and
                    the chevron snapped while the text appeared. */}
                <motion.span
                  aria-hidden="true"
                  className="shrink-0 text-muted-foreground"
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: DURATION.base, ease: EASE.out }}
                >
                  <ChevronDown className="size-5" />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    key="panel"
                    id={panelId}
                    role="region"
                    aria-labelledby={triggerId}
                    initial="collapsed"
                    animate="open"
                    exit="collapsed"
                    variants={{
                      open: { height: "auto", opacity: 1 },
                      collapsed: { height: 0, opacity: 0 },
                    }}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : {
                            height: { duration: DURATION.slow, ease: EASE.out },
                            // Opacity trails the height slightly so text fades
                            // in against an already-opening panel instead of
                            // appearing to push it open.
                            opacity: { duration: DURATION.base, ease: EASE.out },
                          }
                    }
                    className="overflow-hidden"
                  >
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.a}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </article>
          );
        })}
      </div>
    </section>
  );
}
