"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronDown,
  Minus,
  Plus,
  ShieldCheck,
  Ticket,
  Landmark,
  ReceiptText,
  CircleDot,
  Zap,
} from "lucide-react";

type ApplicationCardProps = {
  onStart?: () => void;
  selectedPlan: number;
  onSelectPlan: (index: number) => void;
  className?: string;
};

// Helper function to get the date dynamically (e.g. 2 days ahead)
const getFormattedDate = (daysAhead: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  
  const day = date.getDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  
  // Get ordinal suffix
  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };
  
  return `${day}${getOrdinal(day)} ${month}`;
};

export function ApplicationCard({
  onStart,
  selectedPlan,
  onSelectPlan,
  className,
}: ApplicationCardProps) {
  const shouldReduceMotion = useReducedMotion();

  // Local state for visa application options
  const [visaType, setVisaType] = useState<"Tourism" | "Business">("Tourism");
  const [travellers, setTravellers] = useState<number>(1);

  // Derived state directly from hoisted parent state (avoids useEffect cascading renders)
  const validity = selectedPlan === 0 ? "30 Days" : "60 Days";

  // Sync right-side validity selection back to left-side plans
  const handleValidityChange = (val: "30 Days" | "60 Days") => {
    if (val === "30 Days") {
      onSelectPlan(0);
    } else {
      onSelectPlan(1);
    }
  };

  // Pricing calculation matching the user's plan options
  const getBaseFees = (type: "Tourism" | "Business", val: "30 Days" | "60 Days") => {
    if (type === "Business") {
      return {
        gov: val === "60 Days" ? 17000 : 13500,
        service: 999,
      };
    }
    // Tourism
    return {
      gov: val === "60 Days" ? 12000 : 7000,
      service: 499,
    };
  };

  const baseFees = getBaseFees(visaType, validity);
  const payNowAmount = baseFees.gov * travellers;
  const payOnApprovalAmount = baseFees.service * travellers;
  const totalAmount = payNowAmount + payOnApprovalAmount;

  // Stagger entrance animation variants (one-time soft entrance)
  const cardContainerVariants = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 28,
      scale: shouldReduceMotion ? 1 : 0.96,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.7,
        ease: "easeOut" as const,
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" as const },
    },
  };

  return (
    <aside className={className || "w-full max-w-md mx-auto md:max-w-none px-4 py-8 select-none"}>
      {/* Dynamic CTA shine styles injected locally */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes cta-shine {
            0% { transform: skewX(-20deg) translateX(-180%); }
            40% { transform: skewX(-20deg) translateX(180%); }
            100% { transform: skewX(-20deg) translateX(180%); }
          }
          .animate-cta-shine {
            animation: cta-shine 4s infinite ease-in-out;
          }
        `
      }} />

      {/* Main card wrapper (flat, static but with entry animation) */}
      <motion.div
        variants={cardContainerVariants}
        initial="hidden"
        animate="visible"
        className="w-full"
      >
        {/* Card Body with Glassmorphism, animated border & shadow based on selected option */}
        <motion.div
          animate={shouldReduceMotion ? {} : {
            borderColor: selectedPlan === 0 ? "rgba(217, 119, 6, 0.7)" : "rgba(22, 163, 74, 0.7)",
            boxShadow: selectedPlan === 0 
              ? "0 20px 50px rgba(217, 119, 6, 0.05), 0 1px 3px rgba(217, 119, 6, 0.01)" 
              : "0 20px 50px rgba(22, 163, 74, 0.05), 0 1px 3px rgba(22, 163, 74, 0.01)"
          }}
          transition={{ duration: 0.4, ease: "easeInOut" as const }}
          className="w-full rounded-[28px] border bg-white/95 backdrop-blur-md p-3.5 md:p-4 transition-colors duration-300"
        >
          
          {/* Top Status Bar with active capsule sliding transition */}
          <motion.div variants={itemVariants} className="mb-4">
            <div className="relative flex items-center justify-between rounded-2xl bg-slate-100/80 border border-slate-200/30 p-1 min-h-[46px] w-full">
              
              {/* Option 1 Button: 30 Days selection */}
              <button
                type="button"
                onClick={() => onSelectPlan(0)}
                className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition duration-300 cursor-pointer ${
                  selectedPlan === 0 ? "text-amber-600" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {selectedPlan === 0 && (
                  <motion.div
                    layoutId="activeStatusTab"
                    animate={{
                      borderColor: "rgba(217, 119, 6, 0.75)"
                    }}
                    className="absolute inset-0 bg-white rounded-xl shadow-sm border-2 -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {selectedPlan === 0 && <ShieldCheck className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 animate-fade-in" />}
                <span>
                  {selectedPlan === 0 
                    ? `Guaranteed by ${getFormattedDate(2)}, 07:33 pm` 
                    : getFormattedDate(2)
                  }
                </span>
              </button>

              {/* Option 2 Button: 60 Days selection */}
              <button
                type="button"
                onClick={() => onSelectPlan(1)}
                className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition duration-300 cursor-pointer ${
                  selectedPlan === 1 ? "text-emerald-600" : "text-slate-800 hover:text-slate-900"
                }`}
              >
                {selectedPlan === 1 && (
                  <motion.div
                    layoutId="activeStatusTab"
                    animate={{
                      borderColor: "rgba(22, 163, 74, 0.75)"
                    }}
                    className="absolute inset-0 bg-white rounded-xl shadow-sm border-2 -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Zap className={`h-3.5 w-3.5 flex-shrink-0 ${
                  selectedPlan === 1 ? "text-emerald-600 fill-emerald-600" : "text-slate-900 fill-slate-900"
                }`} />
                <span>
                  {selectedPlan === 1 
                    ? `Guaranteed by ${getFormattedDate(2)}, 11:33 am` 
                    : "8 hours faster"
                  }
                </span>
              </button>

            </div>
          </motion.div>

          {/* Visa configuration selectors */}
          <motion.div variants={itemVariants} className="mb-3.5">
            <div className="grid grid-cols-2 divide-x divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/50 p-1">
              {/* Visa Type Selector */}
              <div className="relative group/field px-3 py-2 text-left">
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                  Visa Type
                </label>
                <div className="relative mt-0.5 flex items-center">
                  <select
                    value={visaType}
                    onChange={(e) => setVisaType(e.target.value as "Tourism" | "Business")}
                    className="w-full bg-transparent border-0 p-0 text-sm font-semibold text-slate-800 focus:ring-0 focus:outline-none cursor-pointer appearance-none pr-5 z-10"
                  >
                    <option value="Tourism">Tourism</option>
                    <option value="Business">Business</option>
                  </select>
                  <ChevronDown className="absolute right-0.5 h-3.5 w-3.5 text-slate-400 pointer-events-none transition-transform group-hover/field:translate-y-0.5" />
                </div>
              </div>

              {/* Validity Selector */}
              <div className="relative group/field px-3 py-2 text-left">
                <label className="block text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                  Validity
                </label>
                <div className="relative mt-0.5 flex items-center">
                  <select
                    value={validity}
                    onChange={(e) => handleValidityChange(e.target.value as "30 Days" | "60 Days")}
                    className="w-full bg-transparent border-0 p-0 text-sm font-semibold text-slate-800 focus:ring-0 focus:outline-none cursor-pointer appearance-none pr-5 z-10"
                  >
                    <option value="30 Days">30 Days Single</option>
                    <option value="60 Days">60 Days Single</option>
                  </select>
                  <ChevronDown className="absolute right-0.5 h-3.5 w-3.5 text-slate-400 pointer-events-none transition-transform group-hover/field:translate-y-0.5" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Traveller Stepper Counter */}
          <motion.div variants={itemVariants} className="mb-4">
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_4px_12px_rgba(0,0,0,0.01)]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
                  <CircleDot className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Travellers</p>
                  <p className="text-[10px] text-slate-400">Add info later</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100/85 rounded-full p-0.5">
                <button
                  type="button"
                  onClick={() => setTravellers((t) => Math.max(1, t - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 shadow-sm hover:bg-slate-50 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  disabled={travellers <= 1}
                  aria-label="Decrease travelers"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="min-w-5 text-center text-xs font-bold text-slate-800">
                  {travellers}
                </span>
                <button
                  type="button"
                  onClick={() => setTravellers((t) => Math.min(10, t + 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 shadow-sm hover:bg-slate-50 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  disabled={travellers >= 10}
                  aria-label="Increase travelers"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Pricing Display */}
          <motion.div variants={itemVariants} className="text-center py-3 mb-4">
            <span className="text-[9px] uppercase font-extrabold tracking-[0.25em] text-slate-400">
              To Be Paid Now
            </span>
            <div className="text-4xl font-extrabold tracking-tight text-slate-900 mt-1">
              ₹{totalAmount.toLocaleString("en-IN")}
            </div>
            <div className="mt-1 flex items-center justify-center gap-1 text-[10px] font-semibold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping flex-shrink-0" />
              <span>Price matches official consulate rates</span>
            </div>
          </motion.div>

          {/* Start Application Button with Shine Sweeping Effect */}
          <motion.div variants={itemVariants} className="mb-4">
            <div className="relative group/cta overflow-hidden rounded-2xl shadow-[0_12px_24px_rgba(217,119,6,0.15)] hover:shadow-[0_16px_32px_rgba(217,119,6,0.22)] transition-all duration-300">
              {onStart ? (
                <button
                  type="button"
                  onClick={onStart}
                  className="relative w-full overflow-hidden bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-white font-bold text-sm tracking-wide py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 cursor-pointer border border-amber-400/25 active:scale-[0.99] transition-transform duration-150"
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-[20deg] -translate-x-[180%] animate-cta-shine pointer-events-none" />
                  <span>Start Application</span>
                </button>
              ) : (
                <a
                  href="#application-flow"
                  className="relative block w-full text-center overflow-hidden bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-white font-bold text-sm tracking-wide py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 cursor-pointer border border-amber-400/25 active:scale-[0.99] transition-transform duration-150"
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-[20deg] -translate-x-[180%] animate-cta-shine pointer-events-none" />
                  <span>Start Application</span>
                </a>
              )}
            </div>
          </motion.div>

          {/* Breakdown Rows */}
          <motion.div variants={itemVariants} className="space-y-3 bg-slate-50/50 rounded-2xl border border-slate-100/50 p-3.5">
            {/* Pay Now */}
            <div className="flex items-center justify-between gap-3 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700">
                  <Landmark className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-slate-800">Pay Now</p>
                  <p className="text-[9px] text-slate-400 font-normal">Government Fees</p>
                </div>
              </div>
              <p className="text-slate-800 text-sm">₹{payNowAmount.toLocaleString("en-IN")}</p>
            </div>

            {/* Pay on approval */}
            <div className="flex items-center justify-between gap-3 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Ticket className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <div>
                  <p className="text-slate-800">Pay on approval</p>
                  <p className="text-[9px] text-slate-400 font-normal">Keyrise service fee</p>
                </div>
              </div>
              <p className="text-slate-800 text-sm">₹{payOnApprovalAmount.toLocaleString("en-IN")}</p>
            </div>

            {/* Total Row */}
            <div className="border-t border-slate-100/80 pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200/50 text-slate-600">
                    <ReceiptText className="h-3.5 w-3.5 text-slate-700" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">Total Amount</p>
                </div>
                <p className="text-sm font-bold text-slate-800">₹{totalAmount.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </motion.div>

        </motion.div>
      </motion.div>
    </aside>
  );
}
