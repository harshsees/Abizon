"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Search, ShieldCheck, Compass, Ticket, User } from "lucide-react";

interface NewHeaderProps {
  searchQuery?: string;
  setSearchQuery?: (val: string) => void;
  activeTab?: "explore" | "events";
  setActiveTab?: (val: "explore" | "events") => void;
}

export function NewHeader({ 
  searchQuery = "", 
  setSearchQuery, 
  activeTab = "explore", 
  setActiveTab 
}: NewHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [isAtTop, setIsAtTop] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsAtTop(currentScrollY < 50);

      if (currentScrollY < 100) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY.current) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (setSearchQuery && pathname === "/") {
      setSearchQuery(val);
    } else {
      router.push(`/?search=${encodeURIComponent(val)}`);
    }
  };

  const handleTabClick = (tab: "explore" | "events") => {
    if (setActiveTab && pathname === "/") {
      setActiveTab(tab);
    } else {
      router.push(`/?tab=${tab}`);
    }
  };

  return (
    <header className={`sticky top-0 z-50 transition-all duration-500 ease-out border-b ${
      isVisible ? "translate-y-0" : "-translate-y-full"
    } ${
      isAtTop 
        ? "bg-transparent border-transparent" 
        : "bg-white/80 backdrop-blur-md border-slate-200/60 shadow-sm"
    }`}>
      <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-3 md:px-6">
        
        {/* Left section: Logo & Shield Badge */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/")}
            className="flex items-center gap-2 flex-shrink-0 bg-transparent border-0 p-0 cursor-pointer text-left"
          >
            <svg className="w-8 h-8 text-black" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 80 L50 20 L85 80 Z" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M40 55 L60 55" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
              <path d="M50 20 L55 35" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
            </svg>
            <span className="text-xl font-black tracking-tighter text-slate-900 font-sans">
              keyrise
            </span>
          </button>
          
          {/* Shield Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[11px] font-bold text-emerald-700 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-success-subtle-foreground fill-emerald-600/10" />
            <span>Visas On Time Guaranteed</span>
          </div>
        </div>

        {/* Center Section: Tabs (Explore & Events) */}
        <div className="flex items-center gap-8 font-sans font-medium text-sm">
          <button
            onClick={() => handleTabClick("explore")}
            className={`relative flex items-center gap-2 py-3 px-1 transition-all duration-300 font-semibold cursor-pointer ${
              activeTab === "explore" ? "text-slate-950 font-bold" : "text-muted-foreground hover:text-slate-600"
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Explore</span>
            {activeTab === "explore" && (
              <motion.div 
                layoutId="header-tab-underline"
                className="absolute bottom-0 inset-x-0 h-0.75 bg-slate-950 rounded-full"
              />
            )}
          </button>
          
          <button
            onClick={() => handleTabClick("events")}
            className={`relative flex items-center gap-2 py-3 px-1 transition-all duration-300 font-semibold cursor-pointer ${
              activeTab === "events" ? "text-slate-950 font-bold" : "text-muted-foreground hover:text-slate-600"
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>Events</span>
            {activeTab === "events" && (
              <motion.div 
                layoutId="header-tab-underline"
                className="absolute bottom-0 inset-x-0 h-0.75 bg-slate-950 rounded-full"
              />
            )}
          </button>
        </div>

        {/* Right Section: Search & Profile */}
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search Country"
              value={pathname === "/" ? searchQuery : ""}
              onChange={handleSearchChange}
              className="w-56 pl-10 pr-4 py-2 text-xs font-semibold rounded-full border border-slate-200 bg-slate-50/40 text-slate-700 placeholder-slate-400 hover:bg-slate-50 focus:border-slate-400 focus:bg-white transition-all duration-200"
            />
          </div>

          {/* Profile Avatar Button (Matches 2nd Screenshot with Theme Colors) */}
          <button 
            type="button"
            aria-label="Open your profile"
            onClick={() => router.push("/profile")}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary bg-primary/8 text-primary hover:bg-primary/15 transition-all shadow-sm cursor-pointer"
          >
            <User className="w-5 h-5 text-primary" />
          </button>
        </div>
      </div>
    </header>
  );
}
