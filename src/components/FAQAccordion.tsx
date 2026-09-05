"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useId, useState } from "react";

import type { Country } from "@/data/countries";
import { requiredDocumentLabels } from "@/lib/application/documents";
import { DURATION, EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * PHASE 8C: the FAQ set is now built per destination, because as a flat list it
 * was making claims that were false for entire classes of country.
 *
 * The list was eight fixed entries with `Dubai`/`UAE` string-replaced for the
 * current country. §18 asked whether each is genuinely applicable everywhere
 * it is shown. Four were not:
 *
 *   "Do Indians need a visa for X?" → "Yes, Indian passport holders need a
 *   valid X visa before travel." Rendered on all 30 `Visa Free` destinations,
 *   where it is simply wrong, and contradicted by the same page's own hero,
 *   which says no visa is needed. Now answered from `flow`.
 *
 *   "What documents are required?" → "A valid passport scan, recent
 *   photograph, travel dates, and additional booking documents." The dataset
 *   records exactly what each destination needs, and for 40-odd of them the
 *   answer is "No Documents Required". Now answered from that field.
 *
 *   "Is my passport data secure?" → "All uploads are encrypted in transit and
 *   storage. Access is restricted to verified processing specialists." There
 *   is no transit and no storage: `ApplicationComplete` tells the applicant,
 *   correctly, that the documents never left the device. The answer described
 *   a processing operation that does not exist yet.
 *
 *   "Can I track my application?" → "You are notified by email as your
 *   application moves through document review, filing and decision." There is
 *   no filing, no decision and no email. Same defect the deleted
 *   `MultiStepApplicationForm` had, surviving in prose.
 *
 * The remaining four are genuinely generic and stay. Nothing here is
 * country-specific in the sense §18 warns against — no invented per-country
 * procedures — it is the shared Abizon process, branched on real fields.
 */

import type { VisaFlow } from "@/lib/countryVisa";

type Faq = { q: string; a: string };

function buildFaqs({
  countryName,
  flow,
  documents,
  deliveryAnswer,
}: {
  countryName: string;
  flow: VisaFlow;
  documents: Country["documents"];
  deliveryAnswer: string;
}): Faq[] {
  const visaFree = flow === "visa-free";
  const onArrival = flow === "on-arrival";

  const faqs: Faq[] = [];

  /* 1 — is a visa needed at all. Answered from the flow, never assumed. */
  faqs.push({
    q: `Do Indians need a visa for ${countryName}?`,
    a: visaFree
      ? `No. Indian passport holders can enter ${countryName} without a visa for the stay length shown above. Carry a passport with enough remaining validity and any entry documents the border asks for.`
      : onArrival
        ? `A visa is required, but it is issued on arrival in ${countryName} rather than before you fly. abizon prepares the paperwork you present at the border.`
        : `Yes. Indian passport holders need a ${countryName} visa granted before travel.`,
  });

  /* 2 — how long. Only meaningful where something is being processed. */
  if (!visaFree) {
    faqs.push({
      q: `How long does ${countryName} visa processing take?`,
      a: `${deliveryAnswer} Choosing Express adds priority handling, and a faster date where the destination offers one.`,
    });
  }

  /* 3 — documents. Straight from the dataset field, not from a template. */
  const required = requiredDocumentLabels(documents);
  faqs.push({
    q: "What documents are required?",
    a:
      required.length === 0
        ? `${countryName} does not require supporting documents from Indian passport holders — your passport is enough. If that changes, the application will ask for what is needed before you file.`
        : `${required.join(" and ")}. That is the full list for ${countryName}; the application will not ask for anything the destination does not require.`,
  });

  /* 4 — flights. Only relevant where there is an application to file. */
  if (!visaFree) {
    faqs.push({
      q: "Can I apply without confirmed flight tickets?",
      a: "You can start an application without them. Whether the destination requires a confirmed return booking depends on the visa type, and the application tells you before you file rather than after.",
    });
  }

  /* 5 — data handling. Describes what the software actually does today. */
  faqs.push({
    q: "Is my passport data secure?",
    a: "Today your answers and documents stay in your own browser — nothing is uploaded, so nothing is stored on a abizon server. Closing the tab discards the files. When online filing opens, this answer will describe how they are transmitted and retained.",
  });

  /* 6 — tracking. Stated as what exists, which is a saved draft. */
  faqs.push({
    q: "Can I track my application?",
    a: "Not yet. abizon cannot currently file an application online, so there is no status to follow. Your progress is saved on this device and you can pick it up where you left it.",
  });

  /* 7 — the delay guarantee. Points at the policy rather than restating it. */
  if (!visaFree) {
    faqs.push({
      q: "What happens if my visa is delayed?",
      a: "If the delay is ours, the abizon fee is waived under the on-time delivery guarantee. The refunds policy sets out exactly what is covered and what is not.",
    });
  }

  /* 8 — party size. True of the form as built. */
  faqs.push({
    q: "Can I apply for family members?",
    a: "Yes. One application can carry several travellers, each with their own passport details and documents.",
  });

  return faqs;
}

export function FAQAccordion({
  className,
  countryName = "Dubai",
  /** The dataset's guaranteed delivery, in days. Omitted where unknown. */
  deliveryDays,
  /** Decides which questions apply at all. */
  flow,
  /** The destination's real document requirement. */
  documents,
}: {
  className?: string;
  countryName?: string;
  deliveryDays?: number;
  flow: VisaFlow;
  documents: Country["documents"];
}) {
  // Closed to start. The reference's FAQ opens with every row collapsed, and
  // it is the right default here for a different reason: this list now runs
  // the full content width, so an open first answer pushes the remaining
  // questions below the fold before the reader has chosen one.
  const [open, setOpen] = useState<number | null>(null);
  const reduced = useReducedMotion();
  const baseId = useId();

  const deliveryAnswer =
    typeof deliveryDays === "number"
      ? `abizon guarantees your ${countryName} visa within ${deliveryDays} ${
          deliveryDays === 1 ? "day" : "days"
        } of a complete application, or our fee is waived.`
      : `abizon guarantees your ${countryName} visa by the date shown on your application, or our fee is waived.`;

  /**
   * No more `.replace(/Dubai/g, countryName)`. Substituting a country name into
   * a sentence written about a different country is how "Yes, Indian passport
   * holders need a valid Mauritius visa" reached 30 visa-free pages. The
   * questions are composed for the destination instead.
   */
  const formattedFaqs = buildFaqs({
    countryName,
    flow,
    documents,
    deliveryAnswer,
  });

  return (
    /**
     * PHASE 9. Rebuilt to the reference's FAQ (screenshot 12).
     *
     * The reference sets this as an editorial list, not a stack of controls:
     * a display-serif title, then one question per row in bold navy with a thin
     * plus on the far right, each row separated by a *dashed* hairline. There
     * are no card borders, no shadows and no fill — the rules alone carry the
     * structure, which is why the section can run the full content width
     * without reading as a wall of boxes.
     *
     * Two things are kept from the previous version because they were right:
     * the answer's measure is capped (`max-w-3xl`) so a line of prose never
     * runs 1232px, and the trigger keeps its 44px minimum height.
     */
    <section
      id="faqs"
      className={cn("mx-auto w-full max-w-7xl scroll-mt-24 px-4 md:px-6", className)}
    >
      <h2 className="type-h2 text-foreground js-reveal-heading">
        Frequently asked questions
      </h2>

      <div className="mt-10 md:mt-12">
        {formattedFaqs.map((item, index) => {
          const isOpen = open === index;
          const panelId = `${baseId}-panel-${index}`;
          const triggerId = `${baseId}-trigger-${index}`;

          return (
            <article
              key={item.q}
              className="js-faq-item border-b border-dashed border-border"
            >
              <button
                type="button"
                id={triggerId}
                onClick={() => setOpen(isOpen ? null : index)}
                className="group flex min-h-11 w-full cursor-pointer items-start justify-between gap-6 py-6 text-left md:py-7"
                aria-expanded={isOpen}
                aria-controls={panelId}
              >
                <span className="text-sm font-bold leading-snug text-foreground transition-colors group-hover:text-primary md:text-base">
                  {item.q}
                </span>

                {/* A plus that becomes a minus. Two bars, one of which
                    rotates away — cheaper and steadier than swapping icons,
                    and it shares the panel's easing so the mark and the text
                    move on one curve. The previous chevron came from the
                    lucide set and read as a dropdown rather than an expander. */}
                <span
                  aria-hidden="true"
                  className="relative mt-0.5 h-5 w-5 shrink-0 text-subtle-foreground"
                >
                  <span className="absolute left-0 top-1/2 h-[1.5px] w-5 -translate-y-1/2 rounded-full bg-current" />
                  <motion.span
                    className="absolute left-0 top-1/2 h-[1.5px] w-5 -translate-y-1/2 rounded-full bg-current"
                    animate={{ rotate: isOpen ? 0 : 90 }}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : { duration: DURATION.base, ease: EASE.out }
                    }
                  />
                </span>
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
                    <p className="max-w-3xl pb-7 text-sm leading-7 text-muted-foreground">
                      {item.a}
                    </p>
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
