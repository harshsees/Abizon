"use client";

import React from "react";
import { Compass, HelpCircle, ReceiptText, ShieldCheck } from "lucide-react";

export function VerticalNavbar() {
  const items = [
    { name: "Visas", href: "#visas", icon: ShieldCheck },
    { name: "Destinations", href: "#destinations", icon: Compass },
    { name: "Pricing", href: "#pricing", icon: ReceiptText },
    { name: "Help", href: "#faq", icon: HelpCircle },
  ];

  return (
    <nav className="flex flex-col items-center gap-5 py-2 w-12">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <a
            key={item.name}
            href={item.href}
            className="group relative flex items-center justify-center h-11 w-11 rounded-2xl bg-white border border-slate-200/60 text-slate-400 hover:text-[var(--primary)] hover:border-[var(--primary)] hover:shadow-sm transition-all duration-200"
          >
            <Icon className="h-5 w-5" />
            
            {/* Tooltip */}
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900/95 text-white text-xs font-semibold rounded-xl opacity-0 pointer-events-none translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 whitespace-nowrap shadow-lg z-50">
              {item.name}
              {/* Tooltip Arrow */}
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900/95" />
            </div>
          </a>
        );
      })}
    </nav>
  );
}
