"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

const faqs = [
  {
    q: "Do Indians need a visa for Dubai?",
    a: "Yes, Indian passport holders need a valid UAE visa before travel unless covered by a qualifying visa-on-arrival policy.",
  },
  {
    q: "How long does Dubai visa processing take?",
    a: "Standard processing takes 3-5 working days. Express applications can be processed in 24-48 hours.",
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
    a: "Yes, you get real-time status updates through your dashboard and email notifications.",
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

export function FAQAccordion({ className, countryName = "Dubai" }: { className?: string; countryName?: string }) {
  const [open, setOpen] = useState<number | null>(0);

  const formattedFaqs = faqs.map((faq) => {
    return {
      q: faq.q.replace(/Dubai/g, countryName).replace(/UAE/g, countryName),
      a: faq.a.replace(/Dubai/g, countryName).replace(/UAE/g, countryName),
    };
  });

  return (
    <section id="faq" className={`${className || "mx-auto w-full max-w-4xl px-4 py-14 md:px-6"} scroll-mt-20`}>
      <h2 className="text-3xl font-bold text-[var(--foreground)]">FAQs</h2>
      <div className="mt-6 space-y-3">
        {formattedFaqs.map((item, index) => {
          const isOpen = open === index;
          return (
            <article key={item.q} className="rounded-2xl border border-[var(--border)] bg-white p-4">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : index)}
                className="flex w-full items-center justify-between text-left"
                aria-expanded={isOpen}
              >
                <span className="pr-4 text-sm font-semibold text-[var(--foreground)] md:text-base">
                  {item.q}
                </span>
                <ChevronDown
                  className={`h-5 w-5 text-[var(--muted)] ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.a}</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
