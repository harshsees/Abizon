"use client";

/**
 * The country visa page body.
 *
 * Split out of the route so `app/visa/[countrySlug]/page.tsx` can stay a
 * server component: that's what lets each of the 150-odd destinations
 * prerender with its own <title> and description. Everything below the fold
 * here is interactive (plan selection, modals, scroll-spy), so it all lives
 * on the client side of that boundary.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ApplicationCard } from "@/components/ApplicationCard";
import { DatePickerModal } from "@/components/DatePickerModal";
import { FAQAccordion } from "@/components/FAQAccordion";
import { FeeBreakdown } from "@/components/FeeBreakdown";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
import { RelatedVisas } from "@/components/RelatedVisas";
import { Reviews } from "@/components/Reviews";
import { SubNavbar } from "@/components/SubNavbar";
import { TopHero } from "@/components/TopHero";
import { TravelPlanModal } from "@/components/TravelPlanModal";
import { VisaInfoAndPlans } from "@/components/VisaInfoAndPlans";
import { Country } from "@/data/countries";
import { useHeadingReveal, useMagneticHover, useSectionReveal } from "@/hooks/usePremiumMotion";

export function CountryVisaPage({ country }: { country: Country }) {
  const router = useRouter();

  const [selectedPlan, setSelectedPlan] = useState(0);
  const [isTravelPlanOpen, setIsTravelPlanOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  const pageContainerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  useHeadingReveal(pageContainerRef, ".js-reveal-heading");
  useMagneticHover(pageContainerRef, ".js-magnetic-btn");
  useSectionReveal(
    pageContainerRef,
    ".js-info-item, .js-plan-card, .js-checklist-item, .js-review-card, .js-faq-item",
  );

  useEffect(() => {
    const handleScroll = () => {
      const heroEl = document.getElementById("destinations");
      if (heroEl) {
        setScrolledPastHero(window.scrollY > heroEl.offsetHeight - 55);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleStartApplication = () => setIsTravelPlanOpen(true);

  const handleSelectTravelOption = (option: "before" | "after") => {
    setIsTravelPlanOpen(false);
    if (option === "before") {
      router.push(`/apply?option=before&country=${encodeURIComponent(country.name)}`);
    } else {
      setIsDatePickerOpen(true);
    }
  };

  const handleSelectDate = (date: Date) => {
    setIsDatePickerOpen(false);
    const dateStr = date.toISOString().split("T")[0];
    router.push(
      `/apply?option=after&date=${dateStr}&country=${encodeURIComponent(country.name)}`,
    );
  };

  const displayName = country.name === "United Arab Emirates" ? "Dubai" : country.name;

  return (
    <div ref={pageContainerRef} className="relative flex flex-1 flex-col bg-background">
      <SiteHeader forceHide={scrolledPastHero} />

      <main id="main-content" tabIndex={-1} className="flex-1">
        <div id="destinations" className="scroll-mt-28">
          <TopHero
            ref={heroRef}
            onStart={handleStartApplication}
            countryName={displayName}
            deliveryDays={country.deliveryDays}
            imageUrl={country.imageUrl}
          />
        </div>

        <SubNavbar isSticky={scrolledPastHero} />

        <div className="mx-auto w-full max-w-7xl px-4 pt-4 pb-8 md:px-6 md:pt-6 md:pb-10">
          <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[1.08fr_0.92fr] md:gap-12">
            {/* Left column: scrollable content */}
            <div className="space-y-4 md:space-y-6">
              <div id="visas" className="scroll-mt-28">
                <VisaInfoAndPlans
                  selectedPlan={selectedPlan}
                  onSelectPlan={setSelectedPlan}
                  country={country}
                />
              </div>

              <FeeBreakdown country={country} />

              {/* Mobile/tablet application card stacks in natural order */}
              <div className="mt-6 md:hidden">
                <ApplicationCard
                  selectedPlan={selectedPlan}
                  onSelectPlan={setSelectedPlan}
                  onStart={handleStartApplication}
                  className="mx-auto w-full max-w-md select-none py-4"
                  country={country}
                />
              </div>
            </div>

            {/* Right column: sticky application card (desktop) */}
            <div
              id="pricing"
              className="sticky top-[100px] z-30 hidden w-full self-start pr-1 scroll-mt-28 md:block"
            >
              <ApplicationCard
                selectedPlan={selectedPlan}
                onSelectPlan={setSelectedPlan}
                onStart={handleStartApplication}
                className="w-full select-none"
                country={country}
              />
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
          <Reviews countryName={displayName} />
        </div>

        <div className="mx-auto mt-6 w-full max-w-7xl border-t border-border px-4 pt-6 md:px-6">
          <FAQAccordion className="w-full py-4" countryName={displayName} />
        </div>

        <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
          <RelatedVisas current={country} />
        </div>
      </main>

      {/* Bottom fixed start button for mobile/tablet */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface p-3 md:hidden">
        <button
          type="button"
          onClick={handleStartApplication}
          className="block w-full cursor-pointer rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-on-primary hover:bg-primary-hover"
        >
          Start Application
        </button>
      </div>

      <Footer />

      <TravelPlanModal
        isOpen={isTravelPlanOpen}
        onClose={() => setIsTravelPlanOpen(false)}
        onSelectOption={handleSelectTravelOption}
      />
      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onSelectDate={handleSelectDate}
      />
    </div>
  );
}
