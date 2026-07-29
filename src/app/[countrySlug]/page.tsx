"use client";

import React, { use, useState, useEffect } from "react";
import { useRouter, notFound } from "next/navigation";
import { FAQAccordion } from "@/components/FAQAccordion";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { VisaInfoAndPlans } from "@/components/VisaInfoAndPlans";
import { ApplicationCard } from "@/components/ApplicationCard";
import { TopHero } from "@/components/TopHero";
import { TravelPlanModal } from "@/components/TravelPlanModal";
import { DatePickerModal } from "@/components/DatePickerModal";
import { SubNavbar } from "@/components/SubNavbar";
import { Reviews } from "@/components/Reviews";
import { countriesData, getCountrySlug } from "@/data/countries";

type PageProps = {
  params: Promise<{ countrySlug: string }>;
};

export default function CountryPage({ params }: PageProps) {
  const router = useRouter();
  const { countrySlug } = use(params);

  // Find matching country
  const country = countriesData.find(
    (c) => getCountrySlug(c.name) === countrySlug
  );

  // If no matching country, trigger 404
  if (!country) {
    notFound();
  }

  const [selectedPlan, setSelectedPlan] = useState<number>(0);
  const [isTravelPlanOpen, setIsTravelPlanOpen] = useState<boolean>(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState<boolean>(false);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const heroEl = document.getElementById("destinations");
      if (heroEl) {
        const heroHeight = heroEl.offsetHeight;
        setScrolledPastHero(window.scrollY > heroHeight - 55);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleStartApplication = () => {
    setIsTravelPlanOpen(true);
  };

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
    router.push(`/apply?option=after&date=${dateStr}&country=${encodeURIComponent(country.name)}`);
  };

  const displayName = country.name === "United Arab Emirates" ? "Dubai" : country.name;

  return (
    <div className="flex flex-1 flex-col bg-[var(--background)] relative">
      <Header forceHide={scrolledPastHero} />

      <main className="flex-1">
        <div id="destinations" className="scroll-mt-28">
          <TopHero 
            onStart={handleStartApplication} 
            countryName={displayName} 
            deliveryDays={country.deliveryDays}
            imageUrl={country.imageUrl}
          />
        </div>

        {/* Horizontal Sub-Navbar below the first div (hero banner) */}
        <SubNavbar isSticky={scrolledPastHero} />

        {/* Responsive Grid Layout containing the entire page below TopHero */}
        <div className="mx-auto w-full max-w-7xl px-4 pt-4 pb-8 md:px-6 md:pt-6 md:pb-10">
          <div className="grid grid-cols-1 md:grid-cols-[1.08fr_0.92fr] gap-8 md:gap-12 items-start">
            
            {/* Left Column: Scrollable Content */}
            <div className="space-y-4 md:space-y-6">
              <div id="visas" className="scroll-mt-28">
                <VisaInfoAndPlans 
                  selectedPlan={selectedPlan} 
                  onSelectPlan={setSelectedPlan} 
                  country={country}
                />
              </div>

              {/* Mobile/Tablet Application Card (stacks in natural order) */}
              <div className="md:hidden mt-6">
                <ApplicationCard
                  selectedPlan={selectedPlan}
                  onSelectPlan={setSelectedPlan}
                  onStart={handleStartApplication}
                  className="w-full max-w-md mx-auto py-4 select-none"
                  country={country}
                />
              </div>

            </div>

            {/* Right Column: Sticky Application Card (Desktop) */}
            <div id="pricing" className="sticky top-[100px] hidden md:block self-start w-full pr-1 scroll-mt-28 z-30">
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

        {/* Full-width Reviews Section outside the grid layout */}
        <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
          <Reviews countryName={displayName} />
        </div>

        {/* Full-width FAQs Section outside the grid layout */}
        <div className="mx-auto w-full max-w-7xl px-4 md:px-6 mt-6 pt-6 border-t border-slate-200/50">
          <FAQAccordion className="w-full py-4" countryName={displayName} />
        </div>

      </main>
      
      {/* Bottom fixed start button for Mobile/Tablet */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-white p-3 md:hidden">
        <button
          type="button"
          onClick={handleStartApplication}
          className="block w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-center text-sm font-semibold text-white cursor-pointer"
        >
          Start Application
        </button>
      </div>
      
      <Footer />

      {/* Modals */}
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
