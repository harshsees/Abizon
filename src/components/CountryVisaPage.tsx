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
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AppointmentRequirements } from "@/components/AppointmentRequirements";
import { ApprovalChances } from "@/components/ApprovalChances";
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
import { VisaPartners } from "@/components/VisaPartners";
import { VisaProcess } from "@/components/VisaProcess";
import { VisaRequirements } from "@/components/VisaRequirements";
import { VisaStatistics } from "@/components/VisaStatistics";
import { WhyKeyrise } from "@/components/WhyKeyrise";
import { Country } from "@/data/countries";
import { resolveCountryVisaConfig } from "@/lib/countryVisa";
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
  const startApplication = (details: { travellers: number; plan: number }) => {
    const query = new URLSearchParams({
      country: config.slug,
      travellers: String(details.travellers),
      plan: String(details.plan),
    });
    if (travelDate) query.set("date", travelDate.toISOString().split("T")[0]);
    router.push(`/apply?${query.toString()}`);
  };

  /** The hero and the mobile bar send the user to the panel to configure. */
  const focusApplication = () => {
    document
      .getElementById(APPLICATION_ANCHOR)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
            "fees",
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
              {applicationPanel}
            </div>

            {/* Supporting information. */}
            <div className="space-y-10 md:order-1 md:space-y-12">
              <div id="visas" className="scroll-mt-28">
                <VisaOverview country={country} />
              </div>

              <VisaRequirements country={country} />

              {/* Renders only for the embassy flow. */}
              <AppointmentRequirements config={config} />

              <div id="fee-breakdown" className="scroll-mt-28">
                <FeeBreakdown country={country} />
              </div>

              <WhyKeyrise />

              <VisaProcess />

              <VisaPartners config={config} />

              <ApprovalChances countryName={config.displayName} />

              <VisaStatistics />

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
          <FAQAccordion className="w-full py-4" countryName={config.displayName} />
        </div>

        <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
          <RelatedVisas current={country} />
        </div>
      </main>

      {/* Mobile application bar. Sends the user up to the panel rather than
          starting blind, so the same choices are made on both breakpoints. */}
      <div className="fixed inset-x-0 bottom-0 z-nav border-t border-border bg-surface/95 p-3 backdrop-blur-md md:hidden">
        <button
          type="button"
          onClick={focusApplication}
          className="block w-full cursor-pointer rounded-xl bg-primary px-4 py-3.5 text-center text-sm font-bold text-on-primary hover:bg-primary-hover"
        >
          Start {config.displayName} application
        </button>
      </div>

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
