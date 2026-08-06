"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  LogOut, 
  User, 
  Sparkles, 
  FileText, 
  ChevronRight, 
  ArrowRight,
  ShieldCheck
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  
  // Tab control state
  const [activeSubTab, setActiveSubTab] = useState<"purchased" | "ongoing">("purchased");

  // Timer State for QR Code (Mock dynamic countdown)
  const [timeLeft, setTimeLeft] = useState(44);
  const maxTime = 45;

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? maxTime : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const strokeDashoffset = 75.4 - (75.4 * timeLeft) / maxTime;

  return (
    <div className="min-h-screen bg-[#f7f7fa] flex flex-col font-sans antialiased text-slate-800 pb-20">
      
      {/* 1. HEADER */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-3.5 md:px-6">
          
          {/* Left section: Logo & Slogan */}
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2">
              <svg className="w-8 h-8 text-black" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 80 L50 20 L85 80 Z" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M40 55 L60 55" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
                <path d="M50 20 L55 35" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
              </svg>
              <span className="text-xl font-black tracking-tighter text-slate-900 font-sans uppercase">
                keyrise
              </span>
            </a>
            
            {/* Slogan */}
            <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
              <span className="text-[10px] font-extrabold tracking-widest text-primary uppercase">
                Visas On Time
              </span>
            </div>
          </div>

          {/* Right Section: Exit/LogOut Button */}
          <button 
            onClick={() => router.push("/")}
            className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 text-muted-foreground hover:text-slate-800 transition duration-200 cursor-pointer"
            aria-label="Back to home"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. BODY CONTENT LAYOUT */}
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-12 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDEBAR (Profile details, Loyalty, QR) */}
          <div className="lg:col-span-4 bg-white border border-slate-200/70 shadow-sm rounded-3xl p-6 flex flex-col items-center">
            
            {/* Large double-ringed User Avatar */}
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-slate-100 bg-[#f3f4f6]/80 shadow-sm">
              <div className="absolute inset-2.5 rounded-full bg-slate-200/50 flex items-center justify-center">
                <User className="w-12 h-12 text-muted-foreground" />
              </div>
            </div>

            {/* Phone Number */}
            <h2 className="text-slate-800 font-extrabold text-sm mt-4 tracking-wide">
              +919328415585
            </h2>

            {/* Statistics */}
            <div className="w-full grid grid-cols-2 divide-x divide-slate-100 border-y border-slate-100 py-5 my-6 text-center">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-slate-900 leading-none">0</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1.5 leading-none">
                  Purchased<br/>Applications
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-slate-900 leading-none">0</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1.5 leading-none">
                  Ongoing<br/>Applications
                </span>
              </div>
            </div>

            {/* Loyalty Program Section */}
            <div className="w-full flex flex-col items-start text-left mb-6">
              <h3 className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider mb-2">
                Loyalty Program
              </h3>
              
              <div className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900">Link a program</h4>
                    <p className="text-[10px] font-bold text-muted-foreground mt-0.5">Earn points per visa.</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            {/* Dynamic QR Code Card */}
            <div className="w-full rounded-2xl border border-slate-200/80 p-4 bg-slate-50/50 flex flex-col items-center">
              
              {/* Animated Countdown Timer */}
              <div className="w-full flex items-center justify-between mb-4 px-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Verification QR</span>
                
                <div className="flex items-center gap-1.5 bg-white border border-slate-200/60 py-1 px-2.5 rounded-full shadow-sm">
                  {/* Circular Loader SVG */}
                  <svg className="w-3.5 h-3.5 transform -rotate-90 text-primary" viewBox="0 0 28 28">
                    <circle cx="14" cy="14" r="12" fill="transparent" stroke="#f1f5f9" strokeWidth="2.5" />
                    <circle cx="14" cy="14" r="12" fill="transparent" stroke="currentColor" strokeWidth="2.5" 
                      strokeDasharray="75.4"
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-[10px] font-extrabold text-slate-600">
                    expires in <span className="text-primary">{timeLeft}</span>
                  </span>
                </div>
              </div>

              {/* Realistic SVG QR Code Mockup */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm w-full flex items-center justify-center aspect-square max-w-[200px]">
                <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                  {/* QR Corners */}
                  <path d="M5 5h20v5H10v15H5V5zm5 5h10v10H10V10z" />
                  <path d="M75 5h20v20h-5V10H75V5zm10 5H85v10h10V10z" />
                  <path d="M5 75h5v15h15v5H5V75zm5 10h10v10H10V85z" />
                  
                  {/* QR Nested Centers */}
                  <path d="M13 13h4v4h-4zM83 13h4v4h-4zM13 83h4v4h-4z" />

                  {/* QR Random Matrix Blocks */}
                  <path d="M35 5h5v5h-5zM45 5h10v5H45zM60 5h5v10h-5zM5 30h5v15H5zM15 30h10v5H15zM20 40h10v5H20zM35 20h10v5H35zM40 30h5v5h-5zM50 25h5v10h-5zM65 25h10v5H65zM80 30h15v5H80zM90 40h5v10h-5z" />
                  <path d="M30 50h5v15h-5zM40 50h10v5H40zM55 50h5v10h-5zM65 45h5v15h-5zM75 50h10v5H75zM15 55h15v5H15zM5 65h10v5H5zM20 65h5v10h-5zM35 70h10v5H35zM50 70h5v15h-5zM60 70h15v5H60zM80 65h5v20h-5zM90 70h5v15h-5z" />
                  <path d="M30 80h10v5H30zM45 85h5v10h-5zM65 85h10v5H65zM75 80h5v10h-5zM55 90h15v5H55z" />
                </svg>
              </div>

            </div>

          </div>

          {/* RIGHT CONTENT PANEL (Tabs, empty applications dashboard) */}
          <div className="lg:col-span-8 flex flex-col">
            
            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setActiveSubTab("purchased")}
                className={`relative px-6 py-3.5 text-sm font-bold tracking-wide transition-colors cursor-pointer ${
                  activeSubTab === "purchased" ? "text-primary" : "text-muted-foreground hover:text-slate-600"
                }`}
              >
                Purchased Applications
                {activeSubTab === "purchased" && (
                  <motion.div 
                    layoutId="profile-tab-underline"
                    className="absolute bottom-0 inset-x-0 h-0.75 bg-primary"
                  />
                )}
              </button>
              
              <button
                onClick={() => setActiveSubTab("ongoing")}
                className={`relative px-6 py-3.5 text-sm font-bold tracking-wide transition-colors cursor-pointer ${
                  activeSubTab === "ongoing" ? "text-primary" : "text-muted-foreground hover:text-slate-600"
                }`}
              >
                Ongoing Applications
                {activeSubTab === "ongoing" && (
                  <motion.div 
                    layoutId="profile-tab-underline"
                    className="absolute bottom-0 inset-x-0 h-0.75 bg-primary"
                  />
                )}
              </button>
            </div>

            {/* Dynamic content (Empty states) */}
            <div className="bg-slate-50/45 border border-slate-200/50 rounded-3xl p-10 md:p-16 flex flex-col items-center justify-center text-center mt-6 min-h-[420px] shadow-sm">
              <div className="h-16 w-16 rounded-2xl bg-white border border-slate-200/60 shadow-sm flex items-center justify-center text-muted-foreground mb-6">
                <FileText className="w-7 h-7 stroke-[1.5]" />
              </div>
              
              <h3 className="text-lg font-black text-slate-900">
                No Applications Found
              </h3>
              
              <p className="text-muted-foreground text-sm max-w-sm mt-2 leading-relaxed">
                You haven't started any visa applications yet. Begin your journey to explore the world with Keyrise.
              </p>

              {/* Start Journey CTA Button */}
              <button
                onClick={() => router.push("/")}
                className="mt-8 flex items-center justify-center gap-2 rounded-2xl bg-primary hover:bg-primary-hover px-8 py-3.5 text-center text-sm font-bold text-white shadow-md hover:shadow-lg transition duration-200 active:scale-98 cursor-pointer"
              >
                <span>Start Journey</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </main>

    </div>
  );
}
