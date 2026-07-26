"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

export function VerticalNavbar() {
  const [activeSection, setActiveSection] = useState<string>("visa-info");
  const [isVisible, setIsVisible] = useState(false);

  const items = [
    { name: "Visa Info", href: "#visa-info-section", id: "visa-info" },
    { name: "Documents", href: "#requirements-section", id: "documents" },
    { name: "Visa Process", href: "#process-section", id: "process" },
    { name: "Reviews", href: "#reviews", id: "reviews" },
    { name: "FAQs", href: "#faq", id: "faqs" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;

      // 1. Manage visibility: show vertical navbar only after scrolling past the first div (TopHero ~480px)
      if (scrollY > 480) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }

      // 2. Scroll-spy detection logic
      const offset = 220; // Offset from top of viewport

      const requirementsEl = document.getElementById("requirements-section");
      const processEl = document.getElementById("process-section");
      const faqEl = document.getElementById("faq");

      let currentActive = "visa-info";

      if (faqEl) {
        const rect = faqEl.getBoundingClientRect();
        if (rect.top <= offset) {
          currentActive = "faqs";
        }
      }
      
      if (currentActive === "visa-info" && processEl) {
        const rect = processEl.getBoundingClientRect();
        if (rect.top <= offset) {
          currentActive = "process";
        }
      }

      if (currentActive === "visa-info" && requirementsEl) {
        const rect = requirementsEl.getBoundingClientRect();
        if (rect.top <= offset) {
          currentActive = "documents";
        }
      }

      setActiveSection(currentActive);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial run to set states
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`flex flex-col gap-5 items-start py-4 pl-3 transition-all duration-500 ease-in-out ${
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8 pointer-events-none"
      }`}
    >
      {items.map((item) => {
        const isActive = activeSection === item.id;
        return (
          <a
            key={item.name}
            href={item.href}
            className={`group relative pb-1 text-xs transition-all duration-300 select-none ${
              isActive 
                ? "text-slate-900 font-bold" 
                : "text-slate-500 hover:text-slate-800 font-medium"
            }`}
          >
            <span>{item.name}</span>
            {isActive ? (
              <motion.div
                layoutId="activeVerticalSection"
                className="absolute left-0 right-0 bottom-0 h-0.5 bg-[var(--primary)]"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            ) : (
              <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-transparent group-hover:bg-slate-200/50 transition-colors" />
            )}
          </a>
        );
      })}
    </nav>
  );
}
