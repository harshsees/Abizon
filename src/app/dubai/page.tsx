"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FAQAccordion } from "@/components/FAQAccordion";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { VisaInfoAndPlans } from "@/components/VisaInfoAndPlans";
import { ApplicationCard } from "@/components/ApplicationCard";
import { RequirementChecklist } from "@/components/RequirementChecklist";
import { TopHero } from "@/components/TopHero";
import { TravelPlanModal } from "@/components/TravelPlanModal";
import { DatePickerModal } from "@/components/DatePickerModal";
import { SubNavbar } from "@/components/SubNavbar";

export default function DubaiPage() {
  const router = useRouter();
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
      router.push("/apply?option=before&country=United Arab Emirates");
    } else {
      setIsDatePickerOpen(true);
    }
  };

  const handleSelectDate = (date: Date) => {
    setIsDatePickerOpen(false);
    const dateStr = date.toISOString().split("T")[0];
    router.push(`/apply?option=after&date=${dateStr}&country=United Arab Emirates`);
  };

  return (
    <div className="flex flex-1 flex-col bg-[var(--background)] relative">
      <Header forceHide={scrolledPastHero} />

      <main className="flex-1">
        <div id="destinations" className="scroll-mt-28">
          <TopHero onStart={handleStartApplication} />
        </div>

        {/* Horizontal Sub-Navbar below the first div (hero banner) */}
        <div className="w-full h-[53px] relative z-40">
          <SubNavbar isSticky={scrolledPastHero} />
        </div>

        {/* Responsive Grid Layout containing the entire page below TopHero */}
        <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-10">
          <div className="grid grid-cols-1 md:grid-cols-[1.08fr_0.92fr] gap-8 md:gap-12 items-start">
            
            {/* Left Column: Scrollable Content */}
            <div className="space-y-4 md:space-y-6">
              <div id="visas" className="scroll-mt-28">
                <VisaInfoAndPlans selectedPlan={selectedPlan} onSelectPlan={setSelectedPlan} />
              </div>

              {/* Mobile/Tablet Application Card (stacks in natural order) */}
              <div className="md:hidden mt-6">
                <ApplicationCard
                  selectedPlan={selectedPlan}
                  onSelectPlan={setSelectedPlan}
                  onStart={handleStartApplication}
                  className="w-full max-w-md mx-auto py-4 select-none"
                />
              </div>

              <RequirementChecklist className="w-full py-8 md:py-10 border-t border-slate-200/50 mt-10" />
              
              <div className="border-t border-slate-200/50 pt-6">
                <FAQAccordion className="w-full py-4" />
              </div>
            </div>

            {/* Right Column: Sticky Application Card (Desktop) */}
            <div id="pricing" className="sticky top-[100px] hidden md:block self-start w-full pr-1 scroll-mt-28 z-30">
              <ApplicationCard
                selectedPlan={selectedPlan}
                onSelectPlan={setSelectedPlan}
                onStart={handleStartApplication}
                className="w-full select-none"
              />
            </div>

          </div>
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
