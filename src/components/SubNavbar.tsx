"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface SubNavbarProps {
  isSticky?: boolean;
}

export function SubNavbar({ isSticky = false }: SubNavbarProps) {
  const [activeSection, setActiveSection] = useState<string>("visa-info");

  const items = [
    { name: "Visa Info", href: "#visas", id: "visa-info" },
    { name: "Documents", href: "#requirements", id: "documents" },
    { name: "Visa Process", href: "#requirements", id: "process" }, // Map to requirements as placeholder
    { name: "Reviews", href: "#faq", id: "reviews" }, // Map to faq as reviews placeholder
    { name: "FAQs", href: "#faq", id: "faqs" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const offset = 120; // Height of sticky sub-navbar plus spacing
      const visasEl = document.getElementById("visas");
      const requirementsEl = document.getElementById("requirements");
      const faqEl = document.getElementById("faq");

      let currentActive = "visa-info";

      // Detect active section based on scroll offset from top of viewport
      if (visasEl) {
        const rect = visasEl.getBoundingClientRect();
        if (rect.top <= offset) {
          currentActive = "visa-info";
        }
      }

      if (requirementsEl) {
        const rect = requirementsEl.getBoundingClientRect();
        if (rect.top <= offset) {
          // If we scrolled past requirements, both 'documents' and 'process' are relevant
          currentActive = "documents";
        }
      }

      if (faqEl) {
        const rect = faqEl.getBoundingClientRect();
        if (rect.top <= offset) {
          // If we scrolled past faq, both 'reviews' and 'faqs' are relevant
          currentActive = "faqs";
        }
      }

      setActiveSection(currentActive);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Run initially
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const targetEl = document.querySelector(href);
    if (targetEl) {
      const offset = 70; // Height of sticky bar
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = targetEl.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <nav
      className={`w-full border-b border-slate-200 bg-white transition-all duration-300 ${
        isSticky 
          ? "fixed top-0 inset-x-0 z-50 shadow-md py-3.5" 
          : "relative py-4"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6 flex justify-center items-center gap-8 md:gap-12">
        {items.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <a
              key={item.name}
              href={item.href}
              onClick={(e) => handleClick(e, item.href)}
              className={`group relative pb-1 text-sm transition-all duration-300 font-sans tracking-wide ${
                isActive 
                  ? "text-slate-950 font-bold" 
                  : "text-slate-500 hover:text-slate-900 font-semibold"
              }`}
            >
              <span>{item.name}</span>
              {isActive ? (
                <motion.div
                  layoutId="activeSubSection"
                  className="absolute left-0 right-0 bottom-0 h-0.75 bg-[var(--primary)]"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              ) : (
                <div className="absolute left-0 right-0 bottom-0 h-0.75 bg-transparent group-hover:bg-slate-200/60 transition-colors" />
              )}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
