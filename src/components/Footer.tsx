"use client";

import Link from "next/link";
import { MapPin, ArrowUpRight, MessageSquare, Bot, Sparkles, Brain } from "lucide-react";

import { Wordmark } from "@/components/Wordmark";

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
    { name: "Abizon Atlas", href: "/atlas" },
  ];

  const productLinks = [
    { name: "All Tools", href: "/tools" },
    { name: "Visa Requirements", href: "/tools/visa-requirements" },
    { name: "Schengen Appointment Checker", href: "/tools/schengen-appointment-checker" },
    { name: "Visa Photo Creator", href: "/tools/visa-photo-creator" },
    { name: "Abizon Emergency Helpline", href: "/emergency-helpline" },
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
    { name: "Abizon Passport Index", href: "/passport-index" },
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
              <Wordmark className="text-xl" />
            </div>

            {/* Description */}
            <p className="text-[13px] font-medium text-muted-foreground leading-relaxed max-w-xs">
              Abizon helps you plan, apply, and track visas seamlessly across the world.
            </p>

            {/* Ask AI Section */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Ask AI about Abizon
              </span>
              <div className="flex items-center gap-2">
                <button type="button" aria-label="Chat with Abizon AI" className="h-9 w-9 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-muted-foreground hover:text-slate-800 transition cursor-pointer">
                  <MessageSquare className="w-4 h-4 fill-slate-400/10" />
                </button>
                <button type="button" aria-label="Abizon AI suggestions" className="h-9 w-9 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-muted-foreground hover:text-slate-800 transition cursor-pointer">
                  <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500/10" />
                </button>
                <button type="button" aria-label="Abizon AI knowledge base" className="h-9 w-9 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-muted-foreground hover:text-slate-800 transition cursor-pointer">
                  <Brain className="w-4 h-4 text-violet-500" />
                </button>
                <button type="button" aria-label="Abizon AI assistant" className="h-9 w-9 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-muted-foreground hover:text-slate-800 transition cursor-pointer">
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
            <span>&copy; {new Date().getFullYear()} Abizon. All rights reserved.</span>
            <span>&bull;</span>
            <Link href="/privacy" className="inline-block py-1.5 hover:text-slate-800 transition">Privacy</Link>
            <span>&bull;</span>
            <Link href="/terms" className="inline-block py-1.5 hover:text-slate-800 transition">Terms</Link>
            <span>&bull;</span>
            {/* Not a courtesy link. The destination photographs are CC BY /
                CC BY-SA, which require the author to be named wherever the work
                appears — and the homepage grid shows 152 of them at once, where
                per-card credits are not possible. A site-wide link here is what
                discharges that for the grid. */}
            <Link href="/image-credits" className="inline-block py-1.5 hover:text-slate-800 transition">Image credits</Link>
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
            <Wordmark tone="muted" className="text-xs" />
          </div>

        </div>

      </div>
    </footer>
  );
}
