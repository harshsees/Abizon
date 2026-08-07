"use client";

import Link from "next/link";
import { MapPin, ArrowUpRight, MessageSquare, Bot, Sparkles, Brain } from "lucide-react";

export function Footer() {
  const companyLinks = [
    { name: "Careers", href: "/careers" },
    { name: "Newsroom", href: "/newsroom" },
    { name: "Contact", href: "/contact" },
    { name: "Defense Personnel", href: "/defense-personnel" },
    { name: "Partners", href: "/partners" },
    { name: "Engineering", href: "/engineering" },
    { name: "Faultlines", href: "/faultlines" },
    { name: "Security", href: "/security" },
    { name: "Transparency", href: "/transparency" },
    { name: "Refunds Policy", href: "/refunds-policy" },
    { name: "Fee Change Audit", href: "/fee-change-audit" },
    { name: "Status", href: "/status" },
    { name: "Speed", href: "/speed" },
    { name: "Keyrise Atlas", href: "/atlas" },
  ];

  const productLinks = [
    { name: "All Tools", href: "/tools" },
    { name: "Visa Requirements", href: "/tools/visa-requirements" },
    { name: "Schengen Appointment Checker", href: "/tools/schengen-appointment-checker" },
    { name: "Visa Photo Creator", href: "/tools/visa-photo-creator" },
    { name: "Keyrise Emergency Helpline", href: "/emergency-helpline" },
    { name: "Rejection Recovery", href: "/rejection-recovery" },
    { name: "Student Visa", href: "/student-visa" },
    { name: "Bible", href: "/bible" },
    { name: "Magazine Library", href: "/magazine" },
    { name: "UAE Visa Status Checker", href: "/tools/uae-visa-status-checker" },
  ];

  const guideLinks = [
    { name: "Schengen Visa", href: "/guides/schengen-visa" },
    { name: "US Visa", href: "/guides/us-visa" },
    { name: "UK Visa", href: "/guides/uk-visa" },
    { name: "Japan Visa", href: "/guides/japan-visa" },
    { name: "Keyrise Passport Index", href: "/passport-index" },
  ];

  const officeLocations = [
    {
      address: "7 Khullar Farms, New Delhi, India",
    },
    {
      address: "3rd Floor, Burjuman Mall, Khalid Bin Al Waleed Rd - Al Mankhool - Dubai",
    },
    {
      address: "447 Broadway STE 851, New York, USA",
    },
  ];

  return (
    <footer className="w-full bg-white border-t border-slate-200 mt-16 pt-16 pb-8 font-sans select-none">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        
        {/* Main 5-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 items-start">
          
          {/* Column 1: Brand & Badges (col-span-4) */}
          <div className="lg:col-span-4 space-y-6 flex flex-col items-start text-left">
            
            {/* Logo */}
            <div className="flex items-center gap-2">
              <svg className="w-8 h-8 text-black" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 80 L50 20 L85 80 Z" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M40 55 L60 55" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
                <path d="M50 20 L55 35" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
              </svg>
              <span className="text-xl font-black tracking-tighter text-slate-900 font-sans">
                keyrise
              </span>
            </div>

            {/* Description */}
            <p className="text-[13px] font-medium text-muted-foreground leading-relaxed max-w-xs">
              Keyrise helps you plan, apply, and track visas seamlessly across the world.
            </p>

            {/* Ask AI Section */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Ask AI about Keyrise
              </span>
              <div className="flex items-center gap-2">
                <button type="button" aria-label="Chat with Keyrise AI" className="h-9 w-9 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-muted-foreground hover:text-slate-800 transition cursor-pointer">
                  <MessageSquare className="w-4 h-4 fill-slate-400/10" />
                </button>
                <button type="button" aria-label="Keyrise AI suggestions" className="h-9 w-9 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-muted-foreground hover:text-slate-800 transition cursor-pointer">
                  <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500/10" />
                </button>
                <button type="button" aria-label="Keyrise AI knowledge base" className="h-9 w-9 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-muted-foreground hover:text-slate-800 transition cursor-pointer">
                  <Brain className="w-4 h-4 text-violet-500" />
                </button>
                <button type="button" aria-label="Keyrise AI assistant" className="h-9 w-9 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-muted-foreground hover:text-slate-800 transition cursor-pointer">
                  <Bot className="w-4 h-4 text-emerald-500" />
                </button>
              </div>
            </div>

            {/* Wall Of Love */}
            <div className="space-y-2">
              <Link href="/transparency" className="inline-flex items-center gap-1 py-1.5 text-[11px] font-bold text-slate-800 hover:underline">
                <span>Wall Of Love</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>
              <div className="flex items-center gap-3">
                {/* Overlapping Avatars */}
                <div className="flex -space-x-2">
                  <div className="h-6 w-6 rounded-full border border-white bg-rose-100 text-rose-700 flex items-center justify-center text-[9px] font-black uppercase">P</div>
                  <div className="h-6 w-6 rounded-full border border-white bg-violet-100 text-violet-700 flex items-center justify-center text-[9px] font-black uppercase">A</div>
                  <div className="h-6 w-6 rounded-full border border-white bg-emerald-100 text-emerald-700 flex items-center justify-center text-[9px] font-black uppercase">R</div>
                  <div className="h-6 w-6 rounded-full border border-white bg-amber-100 text-primary-subtle-foreground flex items-center justify-center text-[9px] font-black uppercase">M</div>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">20K+ reviews</span>
              </div>
            </div>

            {/* App Badges */}
            <div className="flex flex-wrap gap-2 pt-2">
              {/* App Store Badge */}
              <a 
                href="#"
                className="flex items-center gap-2 bg-black text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-900 transition min-w-[125px]"
              >
                <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.58 2.95-1.39z" />
                </svg>
                <div className="flex flex-col text-left leading-none">
                  <span className="text-[8px] text-slate-300 font-semibold uppercase">Download on the</span>
                  <span className="text-[11px] font-bold text-white mt-0.5">App Store</span>
                </div>
              </a>

              {/* Play Store Badge */}
              <a 
                href="#"
                className="flex items-center gap-2 bg-black text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-900 transition min-w-[125px]"
              >
                <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24">
                  <path d="M5 3.25c-.28 0-.5.22-.5.5v16.5c0 .28.22.5.5.5h1.22l9.5-9.5-9.5-9.5H5zm2.72 1.5l8.5 8.5-8.5 8.5v-17zM18.5 12l-2.12-2.12 1.62-1.62c.39-.39 1.02-.39 1.41 0l1.62 1.62c.39.39.39 1.02 0 1.41L18.5 12z" />
                </svg>
                <div className="flex flex-col text-left leading-none">
                  <span className="text-[8px] text-slate-300 font-semibold uppercase">GET IT ON</span>
                  <span className="text-[11px] font-bold text-white mt-0.5">Google Play</span>
                </div>
              </a>
            </div>

          </div>

          {/* Column 2: Company (col-span-2) */}
          <div className="lg:col-span-2 space-y-3.5 text-left">
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">
              Company
            </h3>
            <ul className="space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="inline-block py-1 text-xs font-semibold text-muted-foreground hover:text-slate-950 transition">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Products (col-span-2) */}
          <div className="lg:col-span-2 space-y-3.5 text-left">
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">
              Products
            </h3>
            <ul className="space-y-2.5">
              {productLinks.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="inline-block py-1 text-xs font-semibold text-muted-foreground hover:text-slate-950 transition">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Guides (col-span-2) */}
          <div className="lg:col-span-2 space-y-3.5 text-left">
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">
              Guides
            </h3>
            <ul className="space-y-2.5">
              {guideLinks.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="inline-block py-1 text-xs font-semibold text-muted-foreground hover:text-slate-950 transition">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 5: Offices (col-span-2) */}
          <div className="lg:col-span-2 space-y-3.5 text-left">
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">
              Offices
            </h3>
            <ul className="space-y-4">
              {officeLocations.map((loc, idx) => (
                <li key={idx} className="flex gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-xs font-semibold text-muted-foreground leading-normal">
                    {loc.address}
                  </span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bottom copyright segment */}
        <div className="border-t border-slate-200 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-muted-foreground">
          
          {/* Copyright details */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            <span>&copy; {new Date().getFullYear()} Keyrise. All rights reserved.</span>
            <span>&bull;</span>
            <Link href="/privacy" className="inline-block py-1.5 hover:text-slate-800 transition">Privacy</Link>
            <span>&bull;</span>
            <Link href="/terms" className="inline-block py-1.5 hover:text-slate-800 transition">Terms</Link>
          </div>

          {/* Mini Logo right */}
          {/* The wrapper carried `opacity-60`, which dropped this mark to
              2.88:1. Opacity is invisible to a token system — the colour looks
              compliant in the class list while rendering as something else —
              so the de-emphasis comes from the muted token instead. */}
          <div className="flex items-center gap-1.5">
            <svg className="w-5 h-5 text-muted-foreground" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M15 80 L50 20 L85 80 Z" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M40 55 L60 55" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
            </svg>
            <span className="text-xs font-black tracking-tighter text-muted-foreground font-sans uppercase">
              keyrise
            </span>
          </div>

        </div>

      </div>
    </footer>
  );
}
