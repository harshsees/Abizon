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
    <nav className="flex flex-col gap-6 border-l border-slate-200/60 pl-5 py-2">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <a
            key={item.name}
            href={item.href}
            className="group flex items-center gap-3.5 text-sm font-bold text-slate-500 hover:text-[var(--primary)] transition-all duration-200"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 border border-slate-100/50 text-slate-400 group-hover:bg-amber-50 group-hover:border-amber-100 group-hover:text-[var(--primary)] transition-all duration-200">
              <Icon className="h-4.5 w-4.5" />
            </div>
            <span className="group-hover:translate-x-1 transition-transform duration-200">
              {item.name}
            </span>
          </a>
        );
      })}
    </nav>
  );
}
