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
      const offset = 140; // Spacing threshold below header to activate a section
      const scrollPosition = window.scrollY + offset;

      const visasEl = document.getElementById("visas");
      const requirementsEl = document.getElementById("requirements");
      const faqEl = document.getElementById("faq");

      let currentActive = "visa-info";

      // Precise offsetTop scroll-spy checks to prevent frame lag or flickering
      if (faqEl && scrollPosition >= faqEl.offsetTop) {
        currentActive = "faqs";
      } else if (requirementsEl && scrollPosition >= requirementsEl.offsetTop) {
        currentActive = "documents";
      } else if (visasEl && scrollPosition >= visasEl.offsetTop) {
        currentActive = "visa-info";
      }

      setActiveSection(currentActive);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial run
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const targetEl = document.querySelector(href);
    if (targetEl) {
      const offset = 65; // Height of sticky sub-navbar plus gutter
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
      style={{ top: isSticky ? "0px" : "57px" }}
      className={`sticky inset-x-0 w-full z-40 transition-all duration-300 ease-in-out select-none ${
        isSticky 
          ? "bg-white/95 backdrop-blur-sm py-3 mt-0" 
          : "bg-transparent py-2.5 mt-8"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6 flex justify-center items-center gap-12 md:gap-18">
        {items.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <a
              key={item.name}
              href={item.href}
              onClick={(e) => handleClick(e, item.href)}
              className={`group relative pb-2.5 text-[13px] font-sans tracking-wide transition-colors duration-200 ${
                isActive 
                  ? "text-slate-950 font-black" 
                  : "text-slate-400 hover:text-slate-700 font-semibold"
              }`}
            >
              <span>{item.name}</span>
              {isActive ? (
                <motion.div
                  layoutId="activeSubSection"
                  className="absolute left-0 right-0 bottom-0 h-[3px] bg-[var(--primary)] rounded-full"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              ) : (
                <div className="absolute left-0 right-0 bottom-0 h-[3px] bg-transparent group-hover:bg-slate-100 transition-colors" />
              )}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
