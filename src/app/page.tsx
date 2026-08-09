"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  ShieldCheck, 
  Compass, 
  Ticket, 
  Zap, 
  Plane, 
  ClipboardList, 
  Calendar, 
  ChevronDown, 
  User, 
  List, 
  Map, 
  X, 
  Check,
  Clock,
  ArrowRight,
  Sparkles,
  FileText
} from "lucide-react";
import { countriesData, Country, getCountrySlug } from "@/data/countries";
import { CountryCard } from "@/components/CountryCard";
import { SiteHeader } from "@/components/SiteHeader";
import { useSectionReveal, useMagneticHover } from "@/hooks/usePremiumMotion";

export default function Home() {
  const router = useRouter();
  const pageContainerRef = useRef<HTMLDivElement>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"explore" | "events">("explore");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  
  // Filter Dropdown Open State
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Dropdown Values State
  const [deliveryFilter, setDeliveryFilter] = useState("Any Time");
  const [typeFilter, setTypeFilter] = useState("All Visa Types");
  const [documentsFilter, setDocumentsFilter] = useState("Any Documents");
  const [holidaysFilter, setHolidaysFilter] = useState("Select Dates"); // Represents Travel Date

  // Selected Country for Drawer
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  // Wire up page animations
  useSectionReveal(pageContainerRef, ".js-country-card-wrapper");
  useMagneticHover(pageContainerRef, ".js-magnetic-btn");

  // Close dropdowns on click outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveDropdown(null);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const toggleDropdown = (e: React.MouseEvent, dropdown: string) => {
    e.stopPropagation();
    if (activeDropdown === dropdown) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(dropdown);
    }
  };

  // Filter Logic
  const filteredCountries = useMemo(() => {
    return countriesData.filter((country) => {
      // 1. Search Query Filter
      const matchesSearch = country.name.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Visa Delivery Filter
      let matchesDelivery = true;
      if (deliveryFilter === "Within 24 Hours") {
        matchesDelivery = country.deliveryDays <= 1;
      } else if (deliveryFilter === "Within 3 Days") {
        matchesDelivery = country.deliveryDays <= 3;
      } else if (deliveryFilter === "Within 7 Days") {
        matchesDelivery = country.deliveryDays <= 7;
      }

      // 3. Visa Type Filter
      let matchesType = true;
      if (typeFilter !== "All Visa Types") {
        matchesType = country.visaType === typeFilter;
      }

      // 4. Documents Filter
      let matchesDocuments = true;
      if (documentsFilter !== "Any Documents") {
        matchesDocuments = country.documents === documentsFilter;
      }

      // 5. Holidays (Travel Date) Filter
      let matchesHolidays = true;
      if (holidaysFilter !== "Select Dates") {
        // e.g. "Travel in 2 Days" -> filters deliveryDays <= 2
        if (holidaysFilter === "This Week (3 Days)") {
          matchesHolidays = country.deliveryDays <= 3;
        } else if (holidaysFilter === "Next Week (7 Days)") {
          matchesHolidays = country.deliveryDays <= 7;
        } else if (holidaysFilter === "Tomorrow (24h)") {
          matchesHolidays = country.deliveryDays <= 1;
        }
      }

      return matchesSearch && matchesDelivery && matchesType && matchesDocuments && matchesHolidays;
    });
  }, [searchQuery, deliveryFilter, typeFilter, documentsFilter, holidaysFilter]);

  // Handler to initiate visa application
  const handleStartApplication = (countryName: string) => {
    router.push(`/apply?country=${encodeURIComponent(countryName)}`);
  };

  // Map pins still navigate imperatively; the cards themselves are real
  // anchors now and route on their own.
  const handleCountryClick = (country: Country) => {
    router.push(`/visa/${getCountrySlug(country.name)}`);
  };

  // Load from search & tab URL params if redirected from other pages
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchVal = params.get("search");
    if (searchVal) setSearchQuery(searchVal);
    
    const tabVal = params.get("tab");
    if (tabVal === "explore" || tabVal === "events") {
      setActiveTab(tabVal as "explore" | "events");
    }
  }, []);

  // Quick reset filters
  const resetFilters = () => {
    setDeliveryFilter("Any Time");
    setTypeFilter("All Visa Types");
    setDocumentsFilter("Any Documents");
    setHolidaysFilter("Select Dates");
    setSearchQuery("");
  };

  return (
    <div ref={pageContainerRef} className="min-h-screen bg-[#f7f7fa] flex flex-col font-sans antialiased text-slate-800 pb-20 relative">
      
      {/* 1. HEADER */}
      <SiteHeader
        variant="full"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Container */}
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 flex-1 flex flex-col">
        
        {/* Mobile Search Bar */}
        <div className="relative md:hidden mb-4 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search Country"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 text-sm rounded-2xl border border-slate-200 bg-white text-slate-700 placeholder-slate-400"
          />
        </div>

        {/* 2. FILTER CAPSULE BAR (Matches Mockup UI) */}
        {activeTab === "explore" && (
        <div className="w-full flex justify-center mb-10 z-40">
          <div className="relative w-full max-w-4xl rounded-2xl md:rounded-full bg-white border border-slate-200/80 shadow-md py-2.5 px-4 grid grid-cols-2 md:flex md:items-center md:justify-between gap-1 text-[13px] text-slate-700">
            
            {/* Filter Item 1: Visa Delivery */}
            <div className="relative flex-1 min-w-0">
              <button
                type="button"
                onClick={(e) => toggleDropdown(e, "delivery")}
                aria-haspopup="listbox"
                aria-expanded={activeDropdown === "delivery"}
                className="w-full min-w-0 flex items-center gap-2.5 px-3 py-2 rounded-full hover:bg-slate-50 cursor-pointer transition-colors text-left"
              >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-success-subtle-foreground">
                <Zap className="w-4 h-4 fill-emerald-500/10" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="truncate text-[10px] text-muted-foreground font-medium uppercase tracking-wider leading-none">Visa delivery</span>
                <span className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                  <span className="truncate">{deliveryFilter}</span>{" "}<ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                </span>
              </div>

              </button>


              {/* Dropdown Options */}
              <AnimatePresence>
                {activeDropdown === "delivery" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-[120%] left-0 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 text-left"
                  >
                    {["Any Time", "Within 24 Hours", "Within 3 Days", "Within 7 Days"].map((option) => (
                      <button
                        key={option}
                        onClick={() => setDeliveryFilter(option)}
                        className="w-full flex items-center justify-between px-3.5 py-2 text-[13px] font-semibold rounded-xl text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition text-left cursor-pointer"
                      >
                        <span>{option}</span>
                        {deliveryFilter === option && <Check className="w-4 h-4 text-success-subtle-foreground" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="hidden md:block h-8 w-px bg-slate-200" />

            {/* Filter Item 2: Visa Type */}
            <div className="relative flex-1 min-w-0">
              <button
                type="button"
                onClick={(e) => toggleDropdown(e, "type")}
                aria-haspopup="listbox"
                aria-expanded={activeDropdown === "type"}
                className="w-full min-w-0 flex items-center gap-2.5 px-3 py-2 rounded-full hover:bg-slate-50 cursor-pointer transition-colors text-left"
              >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Plane className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="truncate text-[10px] text-muted-foreground font-medium uppercase tracking-wider leading-none">Type</span>
                <span className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                  <span className="truncate">{typeFilter}</span>{" "}<ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                </span>
              </div>

              </button>


              {/* Dropdown Options */}
              <AnimatePresence>
                {activeDropdown === "type" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-[120%] left-0 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 text-left"
                  >
                    {["All Visa Types", "E-Visa", "Visa on Arrival", "Sticker Visa", "Visa Free"].map((option) => (
                      <button
                        key={option}
                        onClick={() => setTypeFilter(option)}
                        className="w-full flex items-center justify-between px-3.5 py-2 text-[13px] font-semibold rounded-xl text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition text-left cursor-pointer"
                      >
                        <span>{option}</span>
                        {typeFilter === option && <Check className="w-4 h-4 text-blue-600" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="hidden md:block h-8 w-px bg-slate-200" />

            {/* Filter Item 3: Documents */}
            <div className="relative flex-1 min-w-0">
              <button
                type="button"
                onClick={(e) => toggleDropdown(e, "documents")}
                aria-haspopup="listbox"
                aria-expanded={activeDropdown === "documents"}
                className="w-full min-w-0 flex items-center gap-2.5 px-3 py-2 rounded-full hover:bg-slate-50 cursor-pointer transition-colors text-left"
              >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 text-primary-subtle-foreground">
                <ClipboardList className="w-4 h-4 fill-amber-500/10" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="truncate text-[10px] text-muted-foreground font-medium uppercase tracking-wider leading-none">Documents</span>
                <span className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                  <span className="truncate">{documentsFilter}</span>{" "}<ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                </span>
              </div>

              </button>


              {/* Dropdown Options */}
              <AnimatePresence>
                {activeDropdown === "documents" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-[120%] left-0 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 text-left"
                  >
                    {["Any Documents", "Passport Only", "Photo + Passport", "No Documents Required"].map((option) => (
                      <button
                        key={option}
                        onClick={() => setDocumentsFilter(option)}
                        className="w-full flex items-center justify-between px-3.5 py-2 text-[13px] font-semibold rounded-xl text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition text-left cursor-pointer"
                      >
                        <span>{option}</span>
                        {documentsFilter === option && <Check className="w-4 h-4 text-primary-subtle-foreground" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="hidden md:block h-8 w-px bg-slate-200" />

            {/* Filter Item 4: Holidays */}
            <div className="relative flex-1 min-w-0">
              <button
                type="button"
                onClick={(e) => toggleDropdown(e, "holidays")}
                aria-haspopup="listbox"
                aria-expanded={activeDropdown === "holidays"}
                className="w-full min-w-0 flex items-center gap-2.5 px-3 py-2 rounded-full hover:bg-slate-50 cursor-pointer transition-colors text-left"
              >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="truncate text-[10px] text-muted-foreground font-medium uppercase tracking-wider leading-none">Holidays</span>
                <span className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                  <span className="truncate">{holidaysFilter}</span>{" "}<ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                </span>
              </div>

              </button>


              {/* Dropdown Options */}
              <AnimatePresence>
                {activeDropdown === "holidays" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-[120%] right-0 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 text-left"
                  >
                    <div className="px-3.5 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Select Travel Date
                    </div>
                    {[
                      { label: "Select Dates", val: "Select Dates" },
                      { label: "Tomorrow (24h)", val: "Tomorrow (24h)" },
                      { label: "This Week (3 Days)", val: "This Week (3 Days)" },
                      { label: "Next Week (7 Days)", val: "Next Week (7 Days)" }
                    ].map((option) => (
                      <button
                        key={option.val}
                        onClick={() => setHolidaysFilter(option.val)}
                        className="w-full flex items-center justify-between px-3.5 py-2 text-[13px] font-semibold rounded-xl text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition text-left cursor-pointer"
                      >
                        <span>{option.label}</span>
                        {holidaysFilter === option.val && <Check className="w-4 h-4 text-rose-600" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>
        )}

        {/* 3. MAIN CARDS GRID OR MAP VIEW */}
        <div className="flex-1 flex flex-col justify-start">

          {activeTab === "events" ? (
            <EventsPanel onBrowseDestinations={() => setActiveTab("explore")} />
          ) : (
          <AnimatePresence mode="wait">
            
            {viewMode === "list" ? (
              <motion.div
                key="list-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col"
              >
                
                {/* Result count & clear filter link */}
                <div className="flex justify-between items-center mb-6 text-sm">
                  <p className="text-muted-foreground font-medium">
                    Showing <span className="font-semibold text-slate-900">{filteredCountries.length}</span> countries
                  </p>
                  
                  {(deliveryFilter !== "Any Time" || typeFilter !== "All Visa Types" || documentsFilter !== "Any Documents" || holidaysFilter !== "Select Dates" || searchQuery !== "") && (
                    <button 
                      onClick={resetFilters}
                      className="text-xs font-bold text-slate-950 hover:text-slate-600 underline cursor-pointer"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>

                {/* Country Cards Grid */}
                {filteredCountries.length > 0 ? (
                  <motion.div 
                    layout
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10"
                  >
                    {filteredCountries.map((country) => (
                      <motion.div
                        layout
                        key={country.id}
                        className="js-country-card-wrapper"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <CountryCard country={country} />
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  /* Empty state */
                  <div className="flex flex-col items-center justify-center py-20 text-center rounded-[32px] bg-white border border-slate-200/50 shadow-sm px-6">
                    <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center text-muted-foreground mb-4">
                      <Search className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">No countries found</h3>
                    <p className="text-muted-foreground text-sm max-w-sm mt-1">
                      No destinations match your filters. Try clearing some selections or searching for a different country.
                    </p>
                    <button 
                      onClick={resetFilters}
                      className="mt-6 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-md cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              /* MAP VIEW (Premium Mock Map Visualization) */
              <motion.div
                key="map-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full flex-1 min-h-[500px] rounded-[40px] bg-slate-900 border border-slate-800/80 shadow-2xl p-6 md:p-8 flex flex-col justify-between overflow-hidden relative"
              >
                {/* Background grid pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/90 to-slate-900/60 pointer-events-none" />

                {/* Map Header */}
                <div className="relative z-10 flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300 mb-2 uppercase tracking-widest">
                      <Sparkles className="w-3 h-3 text-yellow-400 fill-yellow-400/20" /> Interactive Map View
                    </span>
                    <h2 className="text-xl md:text-2xl font-bold text-white leading-tight">
                      Explore Visa-Required Destinations
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md">
                      Interactive globe pins. Click on highlighted destination dots to view details and launch the visa application.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800/80 px-4 py-2.5 rounded-2xl backdrop-blur-md">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-slate-300">
                      {filteredCountries.length} active pins shown
                    </span>
                  </div>
                </div>

                {/* SVG styled world map representation with glowing markers */}
                <div className="relative flex-1 w-full min-h-[350px] flex items-center justify-center py-6 select-none z-10">
                  
                  {/* Styled minimalist World Map SVG */}
                  <svg className="w-full max-w-4xl h-full opacity-20 text-muted-foreground" viewBox="0 0 1000 500" fill="currentColor">
                    {/* Simplified paths representing world continents */}
                    {/* North America */}
                    <path d="M100 80 Q130 50 180 60 T250 80 T280 150 T220 220 T150 200 T100 80 Z" />
                    {/* South America */}
                    <path d="M220 230 Q250 260 270 320 T280 420 T250 450 T200 350 T220 230 Z" />
                    {/* Europe */}
                    <path d="M420 100 Q480 80 520 120 T560 180 T480 200 T420 100 Z" />
                    {/* Africa */}
                    <path d="M450 210 Q520 200 580 250 T560 380 T500 400 T440 320 T450 210 Z" />
                    {/* Asia */}
                    <path d="M540 100 Q650 60 780 120 T850 220 T720 300 T580 240 T540 100 Z" />
                    {/* Southeast Asia Islands */}
                    <path d="M720 310 Q760 320 800 350 T750 380 T700 330 T720 310 Z" />
                    {/* Australia */}
                    <path d="M780 390 Q850 380 880 430 T820 460 T780 390 Z" />
                  </svg>

                  {/* Pulsing Target Pins for 5 main sample destinations */}
                  {/* Pin 1: Thailand */}
                  <div 
                    onClick={() => handleCountryClick(countriesData[0])}
                    className="absolute top-[52%] left-[73.5%] group/pin cursor-pointer flex flex-col items-center"
                  >
                    <div className="absolute -top-12 bg-slate-950 border border-slate-800 text-[10px] text-white py-1 px-2.5 rounded-lg opacity-0 group-hover/pin:opacity-100 transition-opacity duration-200 font-bold whitespace-nowrap shadow-xl">
                      Thailand (E-Visa)
                    </div>
                    <div className="h-5 w-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg relative group-hover/pin:scale-125 transition-transform duration-200">
                      <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping scale-200 opacity-60" />
                    </div>
                  </div>

                  {/* Pin 2: UAE */}
                  <div 
                    onClick={() => handleCountryClick(countriesData[1])}
                    className="absolute top-[42%] left-[62%] group/pin cursor-pointer flex flex-col items-center"
                  >
                    <div className="absolute -top-12 bg-slate-950 border border-slate-800 text-[10px] text-white py-1 px-2.5 rounded-lg opacity-0 group-hover/pin:opacity-100 transition-opacity duration-200 font-bold whitespace-nowrap shadow-xl">
                      UAE (Express Visa)
                    </div>
                    <div className="h-5 w-5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg relative group-hover/pin:scale-125 transition-transform duration-200">
                      <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping scale-200 opacity-60" />
                    </div>
                  </div>

                  {/* Pin 3: Sri Lanka */}
                  <div 
                    onClick={() => handleCountryClick(countriesData[2])}
                    className="absolute top-[56%] left-[66.5%] group/pin cursor-pointer flex flex-col items-center"
                  >
                    <div className="absolute -top-12 bg-slate-950 border border-slate-800 text-[10px] text-white py-1 px-2.5 rounded-lg opacity-0 group-hover/pin:opacity-100 transition-opacity duration-200 font-bold whitespace-nowrap shadow-xl">
                      Sri Lanka (180 Days)
                    </div>
                    <div className="h-5 w-5 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg relative group-hover/pin:scale-125 transition-transform duration-200">
                      <div className="absolute inset-0 bg-amber-500 rounded-full animate-ping scale-200 opacity-60" />
                    </div>
                  </div>

                  {/* Pin 4: Malaysia */}
                  <div 
                    onClick={() => handleCountryClick(countriesData[3])}
                    className="absolute top-[57%] left-[75.5%] group/pin cursor-pointer flex flex-col items-center"
                  >
                    <div className="absolute -top-12 bg-slate-950 border border-slate-800 text-[10px] text-white py-1 px-2.5 rounded-lg opacity-0 group-hover/pin:opacity-100 transition-opacity duration-200 font-bold whitespace-nowrap shadow-xl">
                      Malaysia (Instant)
                    </div>
                    <div className="h-5 w-5 bg-indigo-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg relative group-hover/pin:scale-125 transition-transform duration-200">
                      <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping scale-200 opacity-60" />
                    </div>
                  </div>

                  {/* Pin 5: France */}
                  <div 
                    onClick={() => handleCountryClick(countriesData[10])}
                    className="absolute top-[30%] left-[48%] group/pin cursor-pointer flex flex-col items-center"
                  >
                    <div className="absolute -top-12 bg-slate-950 border border-slate-800 text-[10px] text-white py-1 px-2.5 rounded-lg opacity-0 group-hover/pin:opacity-100 transition-opacity duration-200 font-bold whitespace-nowrap shadow-xl">
                      France (Schengen)
                    </div>
                    <div className="h-5 w-5 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg relative group-hover/pin:scale-125 transition-transform duration-200">
                      <div className="absolute inset-0 bg-rose-500 rounded-full animate-ping scale-200 opacity-60" />
                    </div>
                  </div>

                </div>

                <div className="relative z-10 text-center text-xs text-muted-foreground font-medium">
                  Globe map coordinates mapped using standard projections. Mock data for demonstrational completeness.
                </div>

              </motion.div>
            )}

          </AnimatePresence>
          )}

        </div>

      </main>

      {/* 4. FLOATING ACTION PILL (Bottom Center - Toggle View Mode) */}
      {activeTab === "explore" && (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-slate-900/90 text-white shadow-2xl p-1.5 flex items-center gap-1.5 rounded-full border border-slate-700/50 backdrop-blur-lg">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer ${
              viewMode === "list" ? "bg-white text-slate-900 shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>List View</span>
          </button>
          
          <button
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer ${
              viewMode === "map" ? "bg-white text-slate-900 shadow-md" : "text-slate-400 hover:text-white"
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Map View</span>
          </button>
        </div>
      </div>
      )}

      {/* 5. SLIDE-OVER DRAWER FOR COUNTRY DETAILS & APPLY ACTION */}
      <AnimatePresence>
        {selectedCountry && (
          <>
            {/* Dark blur backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCountry(null)}
              className="fixed inset-0 bg-black z-50 cursor-pointer"
            />

            {/* Slide-over panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col justify-between overflow-hidden"
            >
              {/* Drawer Top Part: Landscape Image & Close Button */}
              <div className="relative h-60 w-full flex-shrink-0">
                <img
                  src={selectedCountry.imageUrl}
                  alt={selectedCountry.name}
                  className="h-full w-full object-cover"
                />
                
                {/* Gradient overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-white via-black/20 to-black/50" />

                {/* Close Button */}
                <button
                  onClick={() => setSelectedCountry(null)}
                  className="absolute top-4 right-4 h-10 w-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition cursor-pointer backdrop-blur-sm"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Country Flag & Title on Top of Banner */}
                <div className="absolute bottom-6 left-6 right-6 flex items-end gap-3.5">
                  <div className="h-14 w-14 flex items-center justify-center rounded-full border-2 border-white bg-white shadow-lg overflow-hidden flex-shrink-0">
                    <img
                      src={`https://flagcdn.com/w80/${selectedCountry.code}.png`}
                      alt={selectedCountry.name}
                      className="h-full w-full object-cover scale-110"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-black text-slate-900 drop-shadow-[0_2px_10px_rgba(255,255,255,1)] leading-none font-sans uppercase">
                      {selectedCountry.name}
                    </h2>
                  </div>
                </div>
              </div>

              {/* Drawer Body Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                
                {/* Visa delivery time badge */}
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-900">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-success-subtle-foreground flex-shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wide leading-none">Guaranteed Delivery</h4>
                    <p className="text-xs text-emerald-700 font-medium mt-1">
                      Visa delivered in <span className="font-bold">{selectedCountry.deliveryDays} {selectedCountry.deliveryDays === 1 ? "day" : "days"}</span> or 100% money back refund.
                    </p>
                  </div>
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Visa Type</span>
                    <span className="mt-1 text-sm font-extrabold text-slate-900 uppercase">{selectedCountry.visaType}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Validity</span>
                    <span className="mt-1 text-sm font-extrabold text-slate-900 uppercase">{selectedCountry.validity}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Visa Fees</span>
                    <span className="mt-1 text-sm font-extrabold text-slate-900 uppercase">{selectedCountry.fees}</span>
                  </div>
                </div>

                {/* Requirements Checklist */}
                <div className="space-y-3.5">
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" /> Required Documents
                  </h3>
                  
                  <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/40 space-y-3">
                    
                    {/* Required item: Passport */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-4.5 w-4.5 flex-shrink-0 rounded-full bg-emerald-100 flex items-center justify-center text-success-subtle-foreground">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Original Passport Page Scan</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Must be valid for at least 6 months after travel date.</p>
                      </div>
                    </div>

                    {/* Required item: Photo (if not "Passport Only" / "No Documents") */}
                    {selectedCountry.documents !== "No Documents Required" && selectedCountry.documents !== "Passport Only" && (
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-4.5 w-4.5 flex-shrink-0 rounded-full bg-emerald-100 flex items-center justify-center text-success-subtle-foreground">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">Recent Passport-Size Photo Scan</h4>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Plain white background, no glasses, no headwear.</p>
                        </div>
                      </div>
                    )}

                    {/* Additional documents context */}
                    <div className="pt-2 text-[11px] text-muted-foreground border-t border-slate-100 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span>Processed digitally. No physical paper submissions required.</span>
                    </div>

                  </div>
                </div>

              </div>

              {/* Drawer footer start button CTA */}
              <div className="border-t border-slate-100 p-6 bg-slate-50/50 flex-shrink-0">
                <button
                  onClick={() => handleStartApplication(selectedCountry.name)}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-center text-sm font-bold text-white hover:bg-slate-800 transition duration-200 cursor-pointer shadow-lg hover:shadow-xl active:scale-98"
                >
                  <span>Start Visa Application</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}

/**
 * The Events tab.
 *
 * `activeTab` was state that nothing read: clicking Events moved the underline
 * and left the destination grid on screen, so the control claimed to switch
 * views and then didn't. The tab now branches, and this is what it branches to.
 *
 * Deliberately minimal — Phase 1 is fixing the state architecture, not
 * designing an Events product. When there is something real to show, this is
 * the single place it goes.
 */
function EventsPanel({
  onBrowseDestinations,
}: {
  onBrowseDestinations: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface px-6 py-20 text-center shadow-e1">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-surface-sunken text-muted-foreground">
        <Ticket className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 className="type-h2 text-foreground">Events are on the way</h2>
      <p className="type-small mt-3 max-w-md text-muted-foreground">
        We&rsquo;re putting together visa-ready trips built around concerts,
        matches and festivals abroad. Nothing is bookable here yet.
      </p>
      <button
        type="button"
        onClick={onBrowseDestinations}
        className="mt-7 cursor-pointer rounded-xl bg-foreground px-6 py-3 text-xs font-bold text-surface transition-colors hover:bg-subtle-foreground"
      >
        Browse destinations instead
      </button>
    </div>
  );
}
