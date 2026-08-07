"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, ChevronDown, CalendarDays, FileText, FolderOpen, Smartphone, Clock3, Scan, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";


const plans = [
  {
    title: "Tourist visa - 30 days",
    price: "₹7,499",
    timing: "15 Jul 2026 at 03:33 PM",
    badge: "Guaranteed",
  },
  {
    title: "Tourist visa - 60 days",
    price: "₹12,499",
    timing: "14 Jul 2026 at 04:33 PM",
    badge: "22 hours sooner",
  },
];

import { Country } from "@/data/countries";

type VisaInfoAndPlansProps = {
  selectedPlan: number;
  onSelectPlan: (index: number) => void;
  country?: Country;
};

const defaultCountry: Country = {
  id: 2,
  name: "United Arab Emirates",
  code: "ae",
  visaType: "E-Visa",
  validity: "60 Days",
  fees: "₹8,099",
  deliveryDays: 1,
  documents: "Passport Only",
  imageUrl: "",
};

const getFormattedDate = (daysAhead: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  
  const day = date.getDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  
  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };
  
  return `${day}${getOrdinal(day)} ${month}`;
};

export function VisaInfoAndPlans({ selectedPlan, onSelectPlan, country = defaultCountry }: VisaInfoAndPlansProps) {
  const displayName = country.name === "United Arab Emirates" ? "Dubai" : country.name;
  const entryType = country.visaType === "Sticker Visa" ? "Single/Multiple" : "Single";
  const methodType = country.visaType === "E-Visa" ? "Paperless" : country.visaType === "Visa on Arrival" ? "On Arrival" : "Consulate/VFS";

  const dynamicPlans = [
    {
      title: `Tourist visa - ${country.validity}`,
      price: country.fees,
      timing: `${getFormattedDate(country.deliveryDays)} at 03:33 PM`,
      badge: "Guaranteed",
    },
    {
      title: `Express visa - ${country.validity}`,
      price: country.fees === "Free" || country.fees === "0" ? "Free" : `₹${(parseInt(country.fees.replace(/[^0-9]/g, '')) + 1500).toLocaleString("en-IN")}`,
      timing: `${getFormattedDate(Math.max(1, country.deliveryDays - 1))} at 11:33 AM`,
      badge: `${country.deliveryDays > 1 ? "1 day faster" : "Priority Processing"}`,
    },
  ];
  // Chances of Approval Section State & Logic
  const quizQuestions = [
    {
      id: 1,
      num: "01",
      question: "Have you travelled internationally before?",
      options: ["Yes", "No"]
    },
    {
      id: 2,
      num: "02",
      question: `Have you travelled to ${displayName} before?`,
      options: ["Yes", "No"]
    },
    {
      id: 3,
      num: "03",
      question: "Have you ever overstayed your visa duration before?",
      options: ["Yes", "No"]
    },
    {
      id: 4,
      num: "04",
      question: "Have you ever been convicted of a crime?",
      options: ["Yes", "No"]
    },
    {
      id: 5,
      num: "05",
      question: "What's your approximate bank balance?",
      options: ["0 - ₹25,000", "₹25,000 - 50000", "₹50,000 - 75000", "₹75,000+"]
    },
    {
      id: 6,
      num: "06",
      question: "Is your passport valid for at least 6 months after your travel date?",
      options: ["Yes", "No"]
    }
  ];

  const [showQuiz, setShowQuiz] = useState(false);
  const [quizStep, setQuizStep] = useState(0); // 0 to 5 for Q1 to Q6, 6 for results
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});

  const handleAnswer = (answer: string) => {
    setQuizAnswers(prev => ({ ...prev, [quizStep]: answer }));
    setQuizStep(prev => prev + 1);
  };

  const calculateResult = () => {
    let score = 75; // base score

    if (quizAnswers[0] === "Yes") score += 10;
    else score -= 10;

    if (quizAnswers[1] === "Yes") score += 10;

    if (quizAnswers[2] === "Yes") score -= 45;
    else score += 5;

    if (quizAnswers[3] === "Yes") score -= 60;
    else score += 5;

    if (quizAnswers[4] === "0 - ₹25,000") score -= 25;
    else if (quizAnswers[4] === "₹25,000 - 50000") score -= 5;
    else if (quizAnswers[4] === "₹50,000 - 75000") score += 5;
    else if (quizAnswers[4] === "₹75,000+") score += 15;

    if (quizAnswers[5] === "No") score -= 80;

    const finalScore = Math.max(1, Math.min(99, score));

    let reason = "Your profile matches the standard requirements for a high approval rate.";
    if (quizAnswers[3] === "Yes") {
      reason = "Criminal record severely impacts visa approval chances.";
    } else if (quizAnswers[5] === "No") {
      reason = "Passport must be valid for at least 6 months after your travel date.";
    } else if (quizAnswers[2] === "Yes") {
      reason = "Overstaying your visa duration severely impacts future applications.";
    } else if (quizAnswers[4] === "0 - ₹25,000") {
      reason = "Low bank balance may impact approval chances.";
    } else if (quizAnswers[0] === "No" && quizAnswers[1] === "No") {
      reason = "First-time international travelers may require additional verification.";
    }

    return { percentage: finalScore, reason };
  };

  const { percentage, reason } = calculateResult();

  const [animatedHeight, setAnimatedHeight] = useState(0);

  useEffect(() => {
    if (quizStep === 6) {
      setAnimatedHeight(0);
      const timer = setTimeout(() => {
        setAnimatedHeight(percentage);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setAnimatedHeight(0);
    }
  }, [quizStep, percentage]);

  // Statistics Section State & Logic
  const [statsTab, setStatsTab] = useState<"processingTime" | "approvalRating">("processingTime");
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [tooltipState, setTooltipState] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false });
  const [hasHoveredChart, setHasHoveredChart] = useState(false);

  const statsProcessingData = [
    { day: "Thu", date: "Thursday, 9 July", valueText: "3 Days 20 Hrs", valueHrs: 92 },
    { day: "Fri", date: "Friday, 10 July", valueText: "3 Days 13 Hrs", valueHrs: 85 },
    { day: "Sat", date: "Saturday, 11 July", valueText: "4 Days 10 Hrs", valueHrs: 106.7 },
    { day: "Sun", date: "Sunday, 12 July", valueText: "4 Days 6 Hrs", valueHrs: 102 },
    { day: "Mon", date: "Monday, 13 July", valueText: "3 Days 16 Hrs", valueHrs: 88 },
    { day: "Tue", date: "Tuesday, 14 July", valueText: "3 Days 19 Hrs", valueHrs: 91 },
    { day: "Wed", date: "Wednesday, 15 July", valueText: "4 Days 9 Hrs", valueHrs: 105 },
  ];

  const statsApprovalData = [
    { day: "Thu", date: "Thursday, 9 July", valueText: "96.0% Approval Rate", valueHrs: 96 },
    { day: "Fri", date: "Friday, 10 July", valueText: "95.0% Approval Rate", valueHrs: 95 },
    { day: "Sat", date: "Saturday, 11 July", valueText: "98.0% Approval Rate", valueHrs: 98 },
    { day: "Sun", date: "Sunday, 12 July", valueText: "97.5% Approval Rate", valueHrs: 97.5 },
    { day: "Mon", date: "Monday, 13 July", valueText: "94.0% Approval Rate", valueHrs: 94 },
    { day: "Tue", date: "Tuesday, 14 July", valueText: "96.5% Approval Rate", valueHrs: 96.5 },
    { day: "Wed", date: "Wednesday, 15 July", valueText: "99.0% Approval Rate", valueHrs: 99 },
  ];

  return (
    <div className="space-y-8 md:space-y-10">
      <div>
        <h1 id="visa-info-section" className="text-2xl font-bold text-foreground scroll-mt-28 js-reveal-heading">
          {displayName} visa information
        </h1>
        {/* Scaled up borderless visa info details aligned in a column grid */}
        <div className="mt-5 space-y-5">
          {/* Row 1: 3 components scaled up */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-b border-border/50 pb-5">
            {/* 1. Visa Type */}
            <div className="flex items-center gap-3.5 js-info-item">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Smartphone className="h-5.5 w-5.5" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Visa Type:</p>
                <p className="text-base md:text-lg font-extrabold text-foreground mt-0.5">{country.visaType}</p>
              </div>
            </div>

            {/* 2. Length of Stay */}
            <div className="flex items-center gap-3.5 js-info-item">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <CalendarDays className="h-5.5 w-5.5" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Length of Stay:</p>
                <div className="relative group inline-block mt-0.5">
                  <span className="text-base md:text-lg font-extrabold text-foreground underline decoration-slate-400 decoration-dotted underline-offset-4 cursor-pointer">
                    {country.validity}
                  </span>
                  {/* Tooltip Box */}
                  <div className="absolute top-full left-0 mt-2.5 hidden group-hover:block w-[280px] bg-surface border border-border rounded-2xl p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)] z-30 pointer-events-none">
                    <p className="text-sm font-bold text-foreground">Length of Stay: {country.validity}</p>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {`The maximum duration that you are allowed to remain in ${displayName} after entering with that particular visa.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Validity */}
            <div className="flex items-center gap-3.5 js-info-item">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-success-subtle-foreground">
                <Clock3 className="h-5.5 w-5.5" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Validity:</p>
                <div className="relative group inline-block mt-0.5">
                  <span className="text-base md:text-lg font-extrabold text-foreground underline decoration-slate-400 decoration-dotted underline-offset-4 cursor-pointer">
                    {country.validity}
                  </span>
                  {/* Tooltip Box */}
                  <div className="absolute top-full left-0 mt-2.5 hidden group-hover:block w-[280px] bg-surface border border-border rounded-2xl p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)] z-30 pointer-events-none">
                    <p className="text-sm font-bold text-foreground">Validity Period: {country.validity}</p>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {`The number of days your visa is active after the date of issuance. We ensure your visa is valid based on your travel dates.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: remaining 2 components scaled up and aligned */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-1">
            {/* 4. Entry */}
            <div className="flex items-center gap-3.5 js-info-item">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <FileText className="h-5.5 w-5.5" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Entry:</p>
                <div className="relative group inline-block mt-0.5">
                  <span className="text-base md:text-lg font-extrabold text-foreground underline decoration-slate-400 decoration-dotted underline-offset-4 cursor-pointer">
                    {entryType}
                  </span>
                  {/* Tooltip Box */}
                  <div className="absolute top-full left-0 mt-2.5 hidden group-hover:block w-[280px] bg-surface border border-border rounded-2xl p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)] z-30 pointer-events-none">
                    <p className="text-sm font-bold text-foreground">Entry: {entryType}</p>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {`You can enter the country only once during the visa's validity period and cannot re-enter using the same visa once you've exited.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Method */}
            <div className="flex items-center gap-3.5 js-info-item">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-primary-subtle-foreground">
                <FolderOpen className="h-5.5 w-5.5" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Method:</p>
                <div className="relative group inline-block mt-0.5">
                  <span className="text-base md:text-lg font-extrabold text-foreground underline decoration-slate-400 decoration-dotted underline-offset-4 cursor-pointer">
                    {methodType}
                  </span>
                  {/* Tooltip Box */}
                  <div className="absolute top-full left-0 mt-2.5 hidden group-hover:block w-[280px] bg-surface border border-border rounded-2xl p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)] z-30 pointer-events-none">
                    <p className="text-sm font-bold text-foreground">Method: {methodType}</p>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {`Apply and receive your visa fully online. No paperwork needed.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3rd Column is empty for alignment balance */}
            <div className="hidden sm:block" />
          </div>
        </div>
      </div>

      <div>
        <div className="relative">
          {/* Header row with indicator dot */}
          <div className="flex items-center gap-2.5">
            <span className="relative z-10 flex h-3 w-3 items-center justify-center rounded-full bg-primary">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
            </span>
            <h1 id="guaranteed-visa-section" className="text-2xl font-bold text-foreground scroll-mt-28 js-reveal-heading">
              Get a Guaranteed Visa on
            </h1>
          </div>

          {/* Indented branching container (restored original spacing) */}
          <div className="mt-6.5 space-y-5.5">
            {dynamicPlans.map((plan, index) => {
              const active = selectedPlan === index;
              return (
                <div key={plan.title} className="relative pl-7 js-plan-card">
                  {/* Curved branch line shown only to the selected plan (restored branch sizes) */}
                  {selectedPlan === 0 && index === 0 && (
                    <motion.div
                      initial={{ opacity: 0, width: 23 }}
                      animate={{ opacity: 1, width: 31 }}
                      transition={{ duration: 0.3 }}
                      className="absolute left-[5px] top-[-26px] h-[51px] border-l-2 border-b-2 border-border rounded-bl-[16px] pointer-events-none"
                    />
                  )}

                  {selectedPlan === 1 && index === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="absolute left-[5px] top-[-26px] bottom-[-22px] w-[2px] bg-border/80 pointer-events-none"
                    />
                  )}

                  {selectedPlan === 1 && index === 1 && (
                    <motion.div
                      initial={{ opacity: 0, width: 23 }}
                      animate={{ opacity: 1, width: 31 }}
                      transition={{ duration: 0.3 }}
                      className="absolute left-[5px] top-0 h-[25px] border-l-2 border-b-2 border-border rounded-bl-[16px] pointer-events-none"
                    />
                  )}

                  <motion.button
                    type="button"
                    onClick={() => onSelectPlan(index)}
                    animate={{ x: active ? 8 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className={`relative w-full rounded-xl border p-3.5 text-left transition ${
                      active
                        ? "border-primary bg-amber-50 shadow-md shadow-amber-100/50"
                        : "border-border bg-surface"
                    }`}
                  >
                    {index === 1 && (
                      <span className="absolute left-3.5 -top-2.5 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                        {plan.badge}
                      </span>
                    )}

                    <div className="flex items-start justify-between gap-2.5 w-full">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {plan.title}
                        </p>
                        <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                          {plan.timing}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-foreground">{plan.price}</p>
                        <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground">
                          TO BE PAID NOW
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between w-full">
                      <span className="inline-flex items-center gap-1.5 text-xs text-primary">
                        <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-semibold">
                          View Timeline
                        </span>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </span>
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          active
                            ? "bg-primary text-white"
                            : "bg-surface text-primary"
                        }`}
                      >
                        {active ? "Selected" : "Select"}
                      </span>
                    </div>
                  </motion.button>
                </div>
              );
            })}
          </div>
        </div>
      </div>      {/* All 7 Emirates with 1 Visa Section */}
      {country.name === "United Arab Emirates" && (
        <div className="pt-8 border-t border-border/50">
          <div className="space-y-6">
          <div>
            <h2 id="emirates-section" className="text-2xl font-bold text-foreground tracking-tight scroll-mt-28">
              All 7 Emirates with 1 Visa
            </h2>
          </div>

          <div className="space-y-3.5 md:space-y-4">
            {/* Top Row: Dubai, Abu Dhabi, Sharjah */}
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              {[
                {
                  name: "Dubai",
                  image: "/images/emirates/dubai.jpg",
                },
                {
                  name: "Abu Dhabi",
                  image: "/images/emirates/abu-dhabi.png",
                },
                {
                  name: "Sharjah",
                  image: "/images/emirates/sharjah.png",
                },
              ].map((emirate) => (
                <div
                  key={emirate.name}
                  className="relative group overflow-hidden rounded-[20px] shadow-sm cursor-pointer h-[180px] sm:h-[240px] md:h-[260px] bg-surface-sunken"
                >
                  <img
                    src={emirate.image}
                    alt={emirate.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-white font-bold text-base sm:text-xl md:text-2xl tracking-tight leading-tight">
                      {emirate.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Row: Ras Al Khaimah, Fujairah, Umm Al Quwain, Ajman */}
            <div className="grid grid-cols-4 gap-2.5 md:gap-3">
              {[
                {
                  name: "Ras Al Khaimah",
                  image: "/images/emirates/ras-al-khaimah.jpg",
                },
                {
                  name: "Fujairah",
                  image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&h=400&q=80",
                },
                {
                  name: "Umm Al Quwain",
                  image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=400&h=400&q=80",
                },
                {
                  name: "Ajman",
                  image: "/images/emirates/ajman.png",
                },
              ].map((emirate) => (
                <div
                  key={emirate.name}
                  className="relative group overflow-hidden rounded-[16px] sm:rounded-[20px] shadow-sm cursor-pointer h-[160px] sm:h-[225px] md:h-[250px] bg-surface-sunken"
                >
                  <img
                    src={emirate.image}
                    alt={emirate.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4">
                    <p className="text-white font-bold text-xs sm:text-base md:text-lg tracking-tight leading-tight break-words">
                      {emirate.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Visa Requirements Section */}
      <div className="pt-8 border-t border-border/50 space-y-5">
        <div>
          <h2 id="requirements-section" className="text-2xl font-bold text-foreground tracking-tight scroll-mt-28 js-reveal-heading">
            {displayName} Visa Requirements
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="inline-flex items-center gap-2 px-4.5 py-2.5 bg-surface-sunken border border-border/60 rounded-2xl font-bold text-sm text-foreground shadow-sm cursor-pointer hover:bg-surface-sunken/50 transition js-checklist-item">
            <Scan className="h-4.5 w-4.5 text-slate-700" />
            Passport Scan
          </div>
          {country.documents === "Photo + Passport" && (
            <div className="inline-flex items-center gap-2 px-4.5 py-2.5 bg-surface-sunken border border-border/60 rounded-2xl font-bold text-sm text-foreground shadow-sm cursor-pointer hover:bg-surface-sunken/50 transition js-checklist-item">
              <FileText className="h-4.5 w-4.5 text-slate-700" />
              Photograph (White Background)
            </div>
          )}
        </div>
      </div>

      {/* Partners We Work With Section */}
      <div className="pt-8 border-t border-border/50 space-y-5">
        <div>
          <h2 id="partners-section" className="text-2xl font-bold text-foreground tracking-tight scroll-mt-28 js-reveal-heading">
            Partners We Work With
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-4 max-w-lg">
          {/* Card 1: Ministry of Foreign Affairs */}
          <div className="flex flex-col items-center justify-center bg-surface border border-border/40 rounded-3xl p-4 aspect-square shadow-sm hover:shadow-md transition duration-300 gap-2">
            <svg className="h-10 w-10 text-primary-subtle-foreground" viewBox="0 0 100 100" fill="currentColor">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2 2" />
              <path d="M50 20 C45 35 25 40 15 50 C25 50 35 45 50 35 C65 45 75 50 85 50 C75 40 55 35 50 20 Z" />
              <circle cx="50" cy="45" r="14" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M43 45 L43 53 L57 53 L57 45 Z" fill="white" />
              <path d="M43 45 L43 53 L47 53 L47 45 Z" fill="#c2410c" />
              <path d="M47 45 L47 47.6 L57 47.6 L57 45 Z" fill="#15803d" />
              <path d="M47 50.4 L47 53 L57 53 L57 50.4 Z" fill="black" />
            </svg>
            <p className="text-[8px] md:text-[9px] font-bold text-center tracking-tight text-amber-800 uppercase leading-tight mt-1 max-w-[85px]">
              Ministry of Foreign Affairs
            </p>
          </div>

          {/* Card 2: Government of Dubai */}
          <div className="flex flex-col items-center justify-center bg-surface border border-border/40 rounded-3xl p-4 aspect-square shadow-sm hover:shadow-md transition duration-300 gap-2">
            <svg className="h-10 w-24 text-red-600" viewBox="0 0 120 40" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 20 C20 10 35 15 45 25 C55 15 70 10 80 20 C90 15 105 15 115 25" />
              <path d="M30 15 C35 5 45 5 50 15" />
              <path d="M75 15 C80 5 90 5 95 15" />
            </svg>
            <p className="text-[8px] md:text-[9px] font-extrabold text-center tracking-wider text-red-600 uppercase leading-none mt-1">
              Government of Dubai
            </p>
          </div>

          {/* Card 3: IATA */}
          <div className="flex flex-col items-center justify-center bg-surface border border-border/40 rounded-3xl p-4 aspect-square shadow-sm hover:shadow-md transition duration-300 gap-2">
            <svg className="h-10 w-20 text-sky-800" viewBox="0 0 100 40" fill="currentColor">
              <path d="M10 15 H40 L35 25 H5 Z" />
              <path d="M90 15 H60 L65 25 H95 Z" />
              <circle cx="50" cy="20" r="14" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M36 20 H64" stroke="currentColor" strokeWidth="2" />
              <path d="M50 6 V34" stroke="currentColor" strokeWidth="2" />
              <path d="M39 12 C44 15 56 15 61 12" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M39 28 C44 25 56 25 61 28" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <p className="text-[10px] md:text-[11px] font-black text-center tracking-widest text-sky-900 uppercase leading-none mt-1">
              IATA
            </p>
          </div>
        </div>
      </div>

      {/* How Process Works Section */}
      <div className="pt-8 border-t border-border/50 space-y-6">
        <div>
          <h2 id="process-section" className="text-2xl font-bold text-foreground tracking-tight scroll-mt-28">
            How Process Works
          </h2>
        </div>

        <div className="relative pl-6 md:pl-8 border-l border-border ml-3.5 space-y-6 pt-2 pb-2">
          {/* Step 1 */}
          <div className="relative">
            <span className="absolute -left-[30px] md:-left-[38px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 border border-white">
              <span className="h-1.5 w-1.5 rounded-full bg-surface"></span>
            </span>
            <div className="rounded-2xl border border-border bg-surface p-5 md:p-6 shadow-sm hover:shadow-md transition duration-300">
              <p className="text-xs font-bold text-primary-subtle-foreground">Step 1</p>
              <h3 className="text-lg font-bold text-foreground mt-1">Apply on Keyrise</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Submit your documents on Keyrise — only pay government fee.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative">
            <span className="absolute -left-[30px] md:-left-[38px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 border border-white">
              <span className="h-1.5 w-1.5 rounded-full bg-surface"></span>
            </span>
            <div className="rounded-2xl border border-border bg-surface p-5 md:p-6 shadow-sm hover:shadow-md transition duration-300">
              <p className="text-xs font-bold text-primary-subtle-foreground">Step 2</p>
              <h3 className="text-lg font-bold text-foreground mt-1">Your Documents Are Verified</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Keyrise verifies your documents and submits to Immigration
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative">
            <span className="absolute -left-[30px] md:-left-[38px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 border border-white">
              <span className="h-1.5 w-1.5 rounded-full bg-surface"></span>
            </span>
            <div className="rounded-2xl border border-border bg-surface p-5 md:p-6 shadow-sm hover:shadow-md transition duration-300 space-y-4">
              <div>
                <p className="text-xs font-bold text-primary-subtle-foreground">Step 3</p>
                <h3 className="text-lg font-bold text-foreground mt-1">Your Visa Gets Processed</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  We work with Immigration to ensure you get your Visa on time.
                </p>
              </div>
              
              {/* Nested tracking sub-timeline */}
              <div className="bg-surface-sunken border border-border rounded-xl p-4.5 space-y-4">
                <div className="relative pl-5 border-l border-amber-500/30 space-y-4 ml-1">
                  {/* Item 1 */}
                  <div className="relative">
                    <span className="absolute -left-[24.5px] top-1 h-2 w-2 rounded-full bg-amber-600 border border-white" />
                    <p className="text-xs font-bold text-slate-800 leading-tight">
                      Application has been sent to the immigration supervisor
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-muted-foreground">8 Jan, 5:45 AM</span>
                      <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-700 uppercase tracking-wider">
                        ON TIME
                      </span>
                    </div>
                  </div>
                  {/* Item 2 */}
                  <div className="relative">
                    <span className="absolute -left-[24.5px] top-1 h-2 w-2 rounded-full bg-amber-600 border border-white" />
                    <p className="text-xs font-bold text-slate-800 leading-tight">
                      Application has been sent to internal intelligence
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-muted-foreground">8 Jan, 5:45 AM</span>
                      <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-700 uppercase tracking-wider">
                        ON TIME
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative">
            <span className="absolute -left-[30px] md:-left-[38px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 border border-white">
              <span className="h-1.5 w-1.5 rounded-full bg-surface"></span>
            </span>
            <div className="rounded-2xl border border-border bg-surface p-5 md:p-6 shadow-sm hover:shadow-md transition duration-300 space-y-4">
              <div>
                <p className="text-xs font-bold text-primary-subtle-foreground">Step 4</p>
                <h3 className="text-lg font-bold text-foreground mt-1">
                  Get Your Visa on <span className="text-primary-subtle-foreground">20 Jul, 01:08 PM</span>
                </h3>
              </div>

              {/* Nested fee grid */}
              <div className="bg-surface-sunken border border-border rounded-xl p-4 divide-y divide-slate-200/60">
                {/* Row 1 */}
                <div className="flex items-center justify-between py-2 first:pt-0">
                  <span className="text-xs font-bold text-slate-700 leading-snug">Your visa is approved on time</span>
                  <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm border border-emerald-100/50">
                    Pay Keyrise Fee
                  </span>
                </div>
                {/* Row 2 */}
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs font-bold text-slate-700 leading-snug max-w-[200px] md:max-w-none">
                    Your visa is approved even one second after the promised time
                  </span>
                  <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-primary-subtle-foreground shadow-sm border border-amber-100/50 shrink-0">
                    Keyrise Fee Waived
                  </span>
                </div>
                {/* Row 3 */}
                <div className="flex items-center justify-between py-2 last:pb-0">
                  <span className="text-xs font-bold text-slate-700 leading-snug">Your visa is rejected</span>
                  <span className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 shadow-sm border border-red-100/50">
                    Government Fee Refunded
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chances of Approval Section */}
      <div className="pt-8 border-t border-border/50 space-y-6 font-sans">
        <div>
          <h2 id="approval-section" className="text-2xl font-bold text-foreground tracking-tight scroll-mt-28">
            Want to know if your will be approved?
          </h2>
        </div>

        <div className="flex items-center justify-center p-4">
          {!showQuiz ? (
            /* Promo Card */
            <div className="w-full max-w-xl bg-surface border border-border/60 rounded-3xl p-5 md:p-6 shadow-sm flex items-center justify-between gap-4">
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-primary-subtle-foreground uppercase tracking-wider">Learn Your</p>
                <h3 className="text-xl md:text-2xl font-extrabold text-slate-800 leading-tight">
                  Chances of Approval
                </h3>
                <p className="text-sm text-muted-foreground">
                  Answer 6 questions to know your chances
                </p>
                <button
                  onClick={() => {
                    setShowQuiz(true);
                    setQuizStep(0);
                    setQuizAnswers({});
                  }}
                  className="inline-flex items-center gap-1 text-sm font-bold text-primary-subtle-foreground hover:text-amber-800 transition mt-2.5 cursor-pointer"
                >
                  Evaluate my chances <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col items-center gap-3 pr-2 shrink-0">
                {/* Dotted gauge wheel */}
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="5" strokeDasharray="1 2.5" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#d97706" /* Amber-600 */
                      strokeWidth="5"
                      strokeDasharray="1 2.5"
                      strokeDashoffset="15"
                      className="transform -rotate-90 origin-center"
                    />
                    <text x="50" y="55" textAnchor="middle" className="text-[17px] font-black fill-amber-700">
                      100%
                    </text>
                  </svg>
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[9.5px] font-bold text-primary-subtle-foreground shadow-sm border border-amber-100/50">
                  Takes 5 seconds
                </span>
              </div>
            </div>
          ) : quizStep < 6 ? (
            /* Active Quiz Interface */
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative flex items-center justify-center w-[340px] h-[340px] sm:w-[400px] sm:h-[400px] rounded-full shadow-md bg-surface-sunken/50">
                {/* SVG Progress Ring for smooth hardware-accelerated circular animation */}
                <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    stroke="#f1f5f9"
                    strokeWidth="3.5"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    stroke="#d97706"
                    strokeWidth="3.5"
                    strokeDasharray={2 * Math.PI * 46}
                    strokeDashoffset={2 * Math.PI * 46 * (1 - quizStep / 6)}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={quizStep}
                    initial={{ opacity: 0, scale: 0.92, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -15 }}
                    transition={{ duration: 0.3 }}
                    className="relative z-10 w-[270px] sm:w-[320px] bg-surface rounded-2xl shadow-xl border border-border p-6 flex flex-col justify-between h-[270px] sm:h-[300px]"
                  >
                    <div>
                      <p className="text-4xl sm:text-5xl font-extrabold text-slate-200 leading-none">
                        {quizQuestions[quizStep].num}
                      </p>
                      <h4 className="text-sm sm:text-base font-bold text-slate-800 mt-4 leading-snug">
                        {quizQuestions[quizStep].question}
                      </h4>
                    </div>

                    <div className="space-y-2">
                      {quizQuestions[quizStep].options.length === 2 ? (
                        <div className="space-y-2 flex flex-col">
                          <button
                            onClick={() => handleAnswer(quizQuestions[quizStep].options[0])}
                            className="w-full py-2 sm:py-2.5 rounded-xl border border-border bg-surface text-xs sm:text-sm font-bold text-muted-foreground hover:bg-primary hover:text-white hover:border-primary transition-all duration-200"
                          >
                            {quizQuestions[quizStep].options[0]}
                          </button>
                          <button
                            onClick={() => handleAnswer(quizQuestions[quizStep].options[1])}
                            className="w-full py-2 sm:py-2.5 rounded-xl border border-border bg-surface text-xs sm:text-sm font-bold text-muted-foreground hover:bg-primary hover:text-white hover:border-primary transition-all duration-200"
                          >
                            {quizQuestions[quizStep].options[1]}
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {quizQuestions[quizStep].options.map(opt => (
                            <button
                              key={opt}
                              onClick={() => handleAnswer(opt)}
                              className="py-2.5 rounded-xl border border-border bg-surface text-[10px] sm:text-xs font-bold text-muted-foreground hover:bg-primary hover:text-white hover:border-primary transition-all duration-200 leading-tight flex items-center justify-center px-1"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          ) : (
            /* Results Screen with Liquid Wave Effect */
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative w-[340px] h-[340px] sm:w-[400px] sm:h-[400px] rounded-full overflow-hidden flex flex-col justify-center items-center p-6 text-center shadow-xl border border-amber-100 bg-amber-50/30">
                
                {/* Wave container filling corresponding to percentage */}
                <div
                  className="absolute bottom-0 left-0 right-0 bg-primary transition-all duration-1000 ease-[cubic-bezier(0.4,0,0.2,1)]"
                  style={{ height: `${animatedHeight}%` }}
                >
                  {/* Front Wave */}
                  <svg className="absolute left-0 w-[200%] h-12 -top-10 text-primary fill-current animate-wave" viewBox="0 0 1200 120" preserveAspectRatio="none">
                    <path d="M0,60 C150,100 350,20 500,60 C650,100 850,20 1000,60 C1150,100 1300,20 1450,60 L1450,120 L0,120 Z" />
                  </svg>
                  {/* Back Wave (slightly offset and transparent) */}
                  <svg className="absolute left-0 w-[200%] h-12 -top-12 text-primary/50 fill-current animate-wave-slow opacity-60" viewBox="0 0 1200 120" preserveAspectRatio="none">
                    <path d="M0,50 C100,20 250,80 400,50 C550,20 700,80 850,50 C1000,20 1150,80 1300,50 L1300,120 L0,120 Z" />
                  </svg>
                </div>

                {/* Info Text Layer overlay on top of wave */}
                <div className="relative z-10 flex flex-col items-center justify-center h-full w-full pt-4">
                  <p
                    className={`text-6xl sm:text-7xl font-black transition-colors duration-500 ${
                      percentage > 50 ? "text-white" : "text-slate-800"
                    }`}
                  >
                    {percentage}%
                  </p>
                  <h4
                    className={`text-lg sm:text-xl font-bold transition-colors duration-500 mt-2 ${
                      percentage > 50 ? "text-amber-50" : "text-slate-700"
                    }`}
                  >
                    Chances of Approval
                  </h4>
                  <p
                    className={`text-xs sm:text-sm max-w-[240px] transition-colors duration-500 mt-2 leading-relaxed font-medium ${
                      percentage > 50 ? "text-amber-100/90" : "text-muted-foreground"
                    }`}
                  >
                    {reason}
                  </p>

                  <div className="mt-6 flex flex-col items-center gap-3 w-full">
                    <button
                      onClick={() => setShowQuiz(false)}
                      className="w-3/4 sm:w-2/3 font-bold px-6 py-3 rounded-full shadow-md transition-transform hover:scale-105 active:scale-95 text-sm cursor-pointer bg-surface text-primary"
                    >
                      Apply anyway
                    </button>
                    
                    <button
                      onClick={() => {
                        setQuizStep(0);
                        setQuizAnswers({});
                      }}
                      className="text-xs font-semibold tracking-wide transition-colors duration-300 text-white hover:text-white/80 underline cursor-pointer"
                    >
                      Retake
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Section */}
      <div className="pt-8 border-t border-border/50 space-y-6 font-sans">
        <div className="relative inline-block">
          <h2 id="statistics-section" className="text-2xl font-bold text-foreground tracking-tight scroll-mt-28">
            Statistics on
          </h2>
          <div className="absolute left-0 bottom-0 h-0.5 w-12 bg-primary" />
        </div>

        <div className="w-full bg-surface border border-border/60 rounded-3xl overflow-hidden shadow-sm">
          {/* Tab Headers */}
          <div className="flex border-b border-border px-6">
            <button
              onClick={() => {
                setStatsTab("processingTime");
                setHoveredPointIndex(null);
                setHasHoveredChart(false);
              }}
              className={`py-4 text-xs font-bold tracking-wider relative transition-colors duration-200 cursor-pointer mr-8 ${
                statsTab === "processingTime" ? "text-primary" : "text-muted-foreground hover:text-slate-800"
              }`}
            >
              VISA PROCESSING TIME
              {statsTab === "processingTime" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.75 bg-primary" />
              )}
            </button>
            <button
              onClick={() => {
                setStatsTab("approvalRating");
                setHoveredPointIndex(null);
                setHasHoveredChart(false);
              }}
              className={`py-4 text-xs font-bold tracking-wider relative transition-colors duration-200 cursor-pointer ${
                statsTab === "approvalRating" ? "text-primary" : "text-muted-foreground hover:text-slate-800"
              }`}
            >
              APPROVAL RATING
              {statsTab === "approvalRating" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.75 bg-primary" />
              )}
            </button>
          </div>

          {/* Inner Panels */}
          <div className="grid grid-cols-1 md:grid-cols-12">
            {/* Left Panel */}
            <div className="md:col-span-4 bg-surface-sunken/50 p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-border min-h-[220px]">
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-slate-800">What is this?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {statsTab === "processingTime"
                    ? "This shows the average time a visa decision took to be delivered on"
                    : "This shows the average approval rating for visa applications delivered on"}
                </p>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-700">
                  {hoveredPointIndex !== null
                    ? (statsTab === "processingTime" ? statsProcessingData[hoveredPointIndex].date : statsApprovalData[hoveredPointIndex].date)
                    : "Monday, 20 July"}
                </p>
                <div className="h-px bg-border/60 w-8 my-2" />
                <p className="text-xl font-extrabold text-primary">
                  {hoveredPointIndex !== null
                    ? (statsTab === "processingTime" ? statsProcessingData[hoveredPointIndex].valueText : statsApprovalData[hoveredPointIndex].valueText)
                    : (statsTab === "processingTime" ? "4 Days 1 Hr" : "98.5% Approval Rate")}
                </p>
              </div>
            </div>

            {/* Right Chart Area */}
            <div className="md:col-span-8 p-6 md:p-8 relative flex flex-col justify-between">
              {/* Chart Grid Lines & SVG Graph */}
              <div className="relative h-[200px] w-full select-none">
                {/* Horizontal grid lines with labels on the right */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] font-bold text-muted-foreground/80">
                  {statsTab === "processingTime" ? (
                    <>
                      <div className="w-full flex items-center justify-between border-b border-dashed border-border pb-1">
                        <span />
                        <span className="pr-1 shrink-0">120 hr</span>
                      </div>
                      <div className="w-full flex items-center justify-between border-b border-dashed border-border pb-1">
                        <span />
                        <span className="pr-1 shrink-0">90 hr</span>
                      </div>
                      <div className="w-full flex items-center justify-between border-b border-dashed border-border pb-1">
                        <span />
                        <span className="pr-1 shrink-0">60 hr</span>
                      </div>
                      <div className="w-full flex items-center justify-between border-b border-dashed border-border pb-1">
                        <span />
                        <span className="pr-1 shrink-0">30 hr</span>
                      </div>
                      <div className="w-full flex items-center justify-between pt-1">
                        <span />
                        <span className="pr-1 shrink-0">0 hr</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-full flex items-center justify-between border-b border-dashed border-border pb-1">
                        <span />
                        <span className="pr-1 shrink-0">100%</span>
                      </div>
                      <div className="w-full flex items-center justify-between border-b border-dashed border-border pb-1">
                        <span />
                        <span className="pr-1 shrink-0">97.5%</span>
                      </div>
                      <div className="w-full flex items-center justify-between border-b border-dashed border-border pb-1">
                        <span />
                        <span className="pr-1 shrink-0">95%</span>
                      </div>
                      <div className="w-full flex items-center justify-between border-b border-dashed border-border pb-1">
                        <span />
                        <span className="pr-1 shrink-0">92.5%</span>
                      </div>
                      <div className="w-full flex items-center justify-between pt-1">
                        <span />
                        <span className="pr-1 shrink-0">90%</span>
                      </div>
                    </>
                  )}
                </div>

                {/* SVG Graph Drawing */}
                <svg
                  className="absolute inset-0 w-full h-full overflow-visible z-10"
                  viewBox="0 0 500 200"
                  preserveAspectRatio="none"
                  onMouseMove={(e) => {
                    if (!hasHoveredChart) {
                      setHasHoveredChart(true);
                    }
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left; // relative X
                    const y = e.clientY - rect.top; // relative Y

                    // Find nearest point index based on SVG width
                    const svgWidth = rect.width;
                    const relativeX = (x / svgWidth) * 500;
                    
                    // X-coordinates: Thu=40, Fri=110, Sat=180, Sun=250, Mon=320, Tue=390, Wed=460
                    const xCoords = [40, 110, 180, 250, 320, 390, 460];
                    let nearestIndex = 0;
                    let minDiff = Infinity;
                    xCoords.forEach((coord, index) => {
                      const diff = Math.abs(relativeX - coord);
                      if (diff < minDiff) {
                        minDiff = diff;
                        nearestIndex = index;
                      }
                    });

                    setHoveredPointIndex(nearestIndex);

                    // Dynamic 2D boundaries for tooltip positioning (along all sides)
                    const tooltipWidth = 175;
                    const tooltipHeight = 70;
                    
                    let tooltipX = x + 15; // default to right of cursor
                    if (x + tooltipWidth + 15 > rect.width) {
                      tooltipX = x - tooltipWidth - 15; // shift to left
                    }

                    let tooltipY = y - tooltipHeight - 15; // default to top of cursor
                    if (y - tooltipHeight - 15 < 0) {
                      tooltipY = y + 15; // shift to bottom
                    }

                    setTooltipState({
                      x: tooltipX,
                      y: tooltipY,
                      show: true
                    });
                  }}
                  onMouseLeave={() => {
                    setHoveredPointIndex(null);
                    setTooltipState(prev => ({ ...prev, show: false }));
                  }}
                >
                  <defs>
                    <clipPath id="chart-clip">
                      <rect
                        x="0"
                        y="0"
                        height="200"
                        width={hasHoveredChart ? 500 : 0}
                        className="transition-all duration-[1200ms] ease-out"
                      />
                    </clipPath>
                  </defs>

                  {/* Dotted path curve */}
                  {statsTab === "processingTime" ? (
                    <path
                      d="M 40 46.7 C 75 50, 75 58.3, 110 58.3 C 145 58.3, 145 22.2, 180 22.2 C 215 22.2, 215 30, 250 30 C 285 30, 285 53.3, 320 53.3 C 355 53.3, 355 48.3, 390 48.3 C 425 48.3, 425 25, 460 25"
                      fill="none"
                      stroke="#d97706"
                      strokeWidth="2.5"
                      strokeDasharray="4 4"
                      clipPath="url(#chart-clip)"
                      className="transition-all duration-300"
                    />
                  ) : (
                    <path
                      d="M 40 80 C 75 90, 75 100, 110 100 C 145 100, 145 40, 180 40 C 215 40, 215 50, 250 50 C 285 50, 285 120, 320 120 C 355 120, 355 70, 390 70 C 425 70, 425 20, 460 20"
                      fill="none"
                      stroke="#d97706"
                      strokeWidth="2.5"
                      strokeDasharray="4 4"
                      clipPath="url(#chart-clip)"
                      className="transition-all duration-300"
                    />
                  )}

                  {/* Vertical Tracking Line & Bullet Point when hovered */}
                  {hoveredPointIndex !== null && (() => {
                    const xCoords = [40, 110, 180, 250, 320, 390, 460];
                    // YCoords for ProcessingTime
                    const yCoordsProcessing = [46.7, 58.3, 22.2, 30, 53.3, 48.3, 25];
                    // YCoords for ApprovalRating
                    const yCoordsApproval = [80, 100, 40, 50, 120, 70, 20];

                    const activeX = xCoords[hoveredPointIndex];
                    const activeY = statsTab === "processingTime" ? yCoordsProcessing[hoveredPointIndex] : yCoordsApproval[hoveredPointIndex];

                    return (
                      <>
                        {/* Smooth vertical tracking line */}
                        <line
                          x1={activeX}
                          y1="0"
                          x2={activeX}
                          y2="200"
                          stroke="#d97706"
                          strokeWidth="1.5"
                          pointerEvents="none"
                        />
                        {/* Glowing tracking dot */}
                        <circle
                          cx={activeX}
                          cy={activeY}
                          r="5.5"
                          fill="#d97706"
                          stroke="white"
                          strokeWidth="2"
                          pointerEvents="none"
                          className="shadow-sm"
                        />
                      </>
                    );
                  })()}
                </svg>

                {/* Floating dynamic popup tooltip following cursor */}
                {tooltipState.show && hoveredPointIndex !== null && (
                  <div
                    className="absolute bg-surface border border-border rounded-2xl p-3.5 shadow-xl pointer-events-none z-30 flex flex-col gap-1 transition-all duration-75 ease-out select-none min-w-[170px]"
                    style={{
                      left: `${tooltipState.x}px`,
                      top: `${tooltipState.y}px`
                    }}
                  >
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none">
                      {statsTab === "processingTime" ? statsProcessingData[hoveredPointIndex].date : statsApprovalData[hoveredPointIndex].date}
                    </p>
                    <p className="text-xs font-black text-primary leading-none mt-1">
                      {statsTab === "processingTime" ? statsProcessingData[hoveredPointIndex].valueText : statsApprovalData[hoveredPointIndex].valueText}
                    </p>
                  </div>
                )}
              </div>

              {/* X-Axis Labels */}
              <div className="flex justify-between items-center text-[11px] font-bold text-muted-foreground mt-4 px-2 select-none">
                <span className="w-10 text-center">Thu</span>
                <span className="w-10 text-center">Fri</span>
                <span className="w-10 text-center">Sat</span>
                <span className="w-10 text-center">Sun</span>
                <span className="w-10 text-center">Mon</span>
                <span className="w-10 text-center">Tue</span>
                <span className="w-10 text-center">Wed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global CSS Style tag for wave keyframes */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes wave-move {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-wave {
          animation: wave-move 6s linear infinite;
        }
        .animate-wave-slow {
          animation: wave-move 10s linear infinite;
        }
      `}} />
    </div>
  );
}
