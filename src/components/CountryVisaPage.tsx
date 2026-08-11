"use client";

/**
 * The country visa page shell.
 *
 * One shell, ~154 destinations. It renders universal chrome and hands each
 * section a `CountryVisaConfig`; nothing here knows about a specific country,
 * and the places that used to (the UAE emirates block, the sticker-visa
 * assumptions, the partner logos) branch on config instead.
 *
 * Phase 4 turned this from an information page with an application card
 * attached into an application page with information beneath it. Three things
 * changed structurally:
 *
 *   1. `ApplicationCard` and `VisaPlanSelector` are gone. Both let the user
 *      choose a processing speed, in different visual languages, with
 *      different invented delivery times. `CountryApplicationPanel` is now the
 *      only place an application is configured or begun.
 *   2. The panel is FIRST in the document, and `order` puts it in the right
 *      column on desktop. Previously the mobile application card was rendered
 *      last, so a phone user scrolled past nine informational sections before
 *      reaching the thing the page exists for.
 *   3. `TravelPlanModal` is gone with its hardcoded "Aug 19, 2026" threshold.
 *      The travel-date question is asked inline in the panel, and an exact date
 *      still opens the existing picker.
 *
 * The route (`app/visa/[countrySlug]/page.tsx`) stays a server component so all
 * ~152 pages keep prerendering with their own metadata.
 *
 * Phase 4.1 was an integrity pass, not a redesign. Three sections left the
 * information column entirely because everything they displayed was invented:
 *
 *   VisaStatistics   a seven-point processing-time chart and an approval-rating
 *                    chart, both hardcoded to a fixed week in July and served
 *                    identically to all 154 destinations. "4 Days 1 Hr" and
 *                    "98.5% Approval Rate" had no source. Deleted; the slot for
 *                    a real series is `CountryVisaConfig.processingTime`.
 *   ApprovalChances  a quiz ending on a percentage, promoted by a "100%" gauge.
 *                    Replaced by `BeforeYouApply`, which says what affects a
 *                    decision and quantifies nothing.
 *   VisaPartners     three hand-drawn crests captioned Ministry of Foreign
 *                    Affairs, Government of Dubai and IATA. No partnership with
 *                    any of them is recorded anywhere in this project.
 *
 * The remaining sections were flattened from bordered cards to hairline-ruled
 * lists. Each one now draws its own top rule and owns its top padding, so the
 * column reads as one document rather than a stack of panels.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AppointmentRequirements } from "@/components/AppointmentRequirements";
import { BeforeYouApply } from "@/components/BeforeYouApply";
import { CountryApplicationPanel } from "@/components/CountryApplicationPanel";
import { CountryHero } from "@/components/CountryHero";
import { DatePickerModal } from "@/components/DatePickerModal";
import { EmiratesCoverage } from "@/components/EmiratesCoverage";
import { FAQAccordion } from "@/components/FAQAccordion";
import { FeeBreakdown } from "@/components/FeeBreakdown";
import { Footer } from "@/components/Footer";
import { RelatedVisas } from "@/components/RelatedVisas";
import { Reviews } from "@/components/Reviews";
import { SiteHeader } from "@/components/SiteHeader";
import { SubNavbar } from "@/components/SubNavbar";
import { VisaOverview } from "@/components/VisaOverview";
import { VisaProcess } from "@/components/VisaProcess";
import { VisaRequirements } from "@/components/VisaRequirements";
import { WhyKeyrise } from "@/components/WhyKeyrise";
import { Country } from "@/data/countries";
import { resolveCountryVisaConfig, type CountryVisaConfig } from "@/lib/countryVisa";
import { useHeadingReveal, useSectionReveal } from "@/hooks/usePremiumMotion";

const APPLICATION_ANCHOR = "application";

export function CountryVisaPage({ country }: { country: Country }) {
  const router = useRouter();
  const config = resolveCountryVisaConfig(country);

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [travelDate, setTravelDate] = useState<Date | undefined>();
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  const pageContainerRef = useRef<HTMLDivElement>(null);

  useHeadingReveal(pageContainerRef, ".js-reveal-heading");
  useSectionReveal(
    pageContainerRef,
    ".js-info-item, .js-checklist-item, .js-review-card, .js-faq-item",
  );

  useEffect(() => {
    const handleScroll = () => {
      const heroEl = document.getElementById("destinations");
      if (heroEl) setScrolledPastHero(window.scrollY > heroEl.offsetHeight - 55);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /**
   * The slug, not the display name. `/apply?country=dubai` is readable,
   * shareable and round-trips through `countryFromSlug`.
   */
  const startApplication = (details: {
    travellers: number;
    plan: number;
    travelWindow?: "soon" | "later";
  }) => {
    const query = new URLSearchParams({
      country: config.slug,
      travellers: String(details.travellers),
      plan: String(details.plan),
    });
    if (travelDate) query.set("date", travelDate.toISOString().split("T")[0]);
    // `when` carries the loose travel answer. Without it the application asked
    // "when do you plan to travel?" again, one screen after the panel had.
    if (details.travelWindow) query.set("when", details.travelWindow);
    router.push(`/apply?${query.toString()}`);
  };

  /** The hero and the mobile bar send the user to the panel to configure. */
  const focusApplication = () => {
    document
      .getElementById(APPLICATION_ANCHOR)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /**
   * PHASE 7B §5 — an application panel only where an application exists.
   *
   * 30 destinations in the dataset are `Visa Free`. Their government fee is ₹0,
   * but the panel still added the Keyrise service fee and GST and printed a
   * total — so a visa-free country page quoted ₹1,769 for a visa nobody needs
   * to buy, beside a hero that had already (correctly) hidden its CTA. The fee
   * breakdown below did the same.
   *
   * Both are now gated on the flow. `VisaFreeNotice` states the entry rules
   * that ARE known and offers nothing to purchase.
   */
  const applicable = config.flow !== "visa-free";

  const applicationPanel = (
    <CountryApplicationPanel
      country={country}
      config={config}
      travelDate={travelDate}
      onPickDate={() => setIsDatePickerOpen(true)}
      onStart={startApplication}
    />
  );

  return (
    <div ref={pageContainerRef} className="relative flex flex-1 flex-col bg-background">
      <SiteHeader forceHide={scrolledPastHero} />

      <main id="main-content" tabIndex={-1} className="flex-1 pb-24 md:pb-0">
        <div id="destinations" className="scroll-mt-28">
          <CountryHero config={config} onStart={focusApplication} />
        </div>

        <SubNavbar
          isSticky={scrolledPastHero}
          sections={[
            "visa-info",
            "documents",
            ...(applicable ? ["fees"] : []),
            "why",
            "reviews",
            ...(config.additionalSections?.length ? ["additional"] : []),
            "faqs",
          ]}
        />

        <div className="mx-auto w-full max-w-7xl px-4 pt-8 pb-8 md:px-6 md:pt-10 md:pb-10">
          <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[1.08fr_0.92fr] md:gap-12">
            {/* Application first in the document, right-hand column on desktop. */}
            <div
              id={APPLICATION_ANCHOR}
              className="scroll-mt-28 md:order-2 md:sticky md:top-[100px] md:z-raised"
            >
              {applicable ? applicationPanel : <VisaFreeNotice config={config} />}
            </div>

            {/* Supporting information.
                Each section below the overview draws its own top hairline and
                owns its own top padding, so the rhythm is one rule per section
                rather than a stack of bordered cards. `space-y` is deliberately
                absent here — it would double the gap. */}
            <div className="md:order-1">
              <div id="visas" className="scroll-mt-28">
                <VisaOverview country={country} />
              </div>

              <VisaRequirements country={country} />

              {/* Renders only for the embassy flow. */}
              <AppointmentRequirements config={config} />

              {/* No visa, no fee to break down. */}
              {applicable && (
                <div id="fee-breakdown" className="scroll-mt-28">
                  <FeeBreakdown country={country} />
                </div>
              )}

              <WhyKeyrise />

              <VisaProcess countryName={config.displayName} />

              <BeforeYouApply />

              {/* Country-scoped extras. Only the UAE declares one today. */}
              {config.additionalSections?.includes("emirates") && (
                <div id="additional-section" className="scroll-mt-28">
                  <EmiratesCoverage />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
          <Reviews countryName={config.displayName} />
        </div>

        <div className="mx-auto mt-6 w-full max-w-7xl border-t border-border px-4 pt-6 md:px-6">
          <FAQAccordion
            className="w-full py-4"
            countryName={config.displayName}
            deliveryDays={config.deliveryDays}
          />
        </div>

        <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
          <RelatedVisas current={country} />
        </div>
      </main>

      {/* Mobile application bar. Sends the user up to the panel rather than
          starting blind, so the same choices are made on both breakpoints. */}
      {applicable && (
      <div className="fixed inset-x-0 bottom-0 z-nav border-t border-border bg-surface/95 p-3 backdrop-blur-md md:hidden">
        <button
          type="button"
          onClick={focusApplication}
          className="block w-full cursor-pointer rounded-xl bg-primary px-4 py-3.5 text-center text-sm font-bold text-on-primary hover:bg-primary-hover"
        >
          Start {config.displayName} application
        </button>
      </div>
      )}

      <Footer />

      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onSelectDate={(date) => {
          setTravelDate(date);
          setIsDatePickerOpen(false);
        }}
      />
    </div>
  );
}

/**
 * What a visa-free destination gets instead of an application panel.
 *
 * States only what the dataset actually knows — the visa type and how long you
 * may stay — and offers nothing to buy. There is no fee, no delivery estimate
 * and no CTA, because none of those exist for a country you can simply fly to.
 */
function VisaFreeNotice({ config }: { config: CountryVisaConfig }) {
  return (
    <aside className="w-full rounded-2xl border border-border bg-surface p-5 shadow-e2 md:p-6">
      <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        No visa required
      </p>
      <h2 className="type-h3 mt-2 text-foreground">
        Indian passport holders can enter {config.displayName} without a visa
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        There is nothing to apply for and nothing to pay Keyrise. Check the
        entry conditions below before you travel — a visa-free entry still has
        rules about passport validity and onward travel.
      </p>

      {config.validity && (
        <dl className="mt-5 divide-y divide-border border-t border-border">
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-2xs text-muted-foreground">Permitted stay</dt>
            <dd className="text-xs font-semibold text-foreground">{config.validity}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-2xs text-muted-foreground">Entry type</dt>
            <dd className="text-xs font-semibold text-foreground">{config.visaType}</dd>
          </div>
        </dl>
      )}
    </aside>
  );
}
