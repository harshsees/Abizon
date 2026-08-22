"use client";

/**
 * The FAQ behind the pill in the card's header.
 *
 * Content comes from the destination's own arrival-card entry, never from the
 * visa FAQ generator — `FAQAccordion` answers questions about applying for a
 * visa through Abizon, which is a different product with a different price and
 * a different promise, and none of its answers are true of this form.
 *
 * The dialog machinery (focus trap, Escape, focus restore, scroll lock, inert
 * siblings) is the shared `Modal`; this only supplies the disclosure list.
 * Native `<details>` for the rows, so they open with a keyboard, are findable
 * with the browser's own find-in-page, and need no state of their own.
 */

import { Modal } from "@/components/ui/modal";
import type { ArrivalCardFaq } from "@/lib/arrivalCard";

export function ArrivalFaqModal({
  open,
  onClose,
  destination,
  scheme,
  faqs,
}: {
  open: boolean;
  onClose: () => void;
  destination: string;
  scheme: string;
  faqs: readonly ArrivalCardFaq[];
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`${destination} — questions`}
      description={`About the ${scheme}, and what this page does with it.`}
      closeLabel="Close questions"
    >
      <ul className="flex flex-col divide-y divide-border">
        {faqs.map((faq) => (
          <li key={faq.question}>
            <details className="group py-3.5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                {faq.question}
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.25}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-[--duration-fast] group-open:rotate-180 motion-reduce:transition-none"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <p className="mt-2 pr-8 text-sm leading-relaxed text-muted-foreground">
                {faq.answer}
              </p>
            </details>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
