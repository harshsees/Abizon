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
    { name: "Documents", href: "#requirements-section", id: "documents" },
    { name: "Visa Process", href: "#process-section", id: "process" },
    { name: "Reviews", href: "#reviews", id: "reviews" },
    { name: "FAQs", href: "#faq", id: "faqs" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const offset = 140; // Spacing threshold below header to activate a section
      const scrollPosition = window.scrollY + offset;

      const visasEl = document.getElementById("visas");
      const requirementsEl = document.getElementById("requirements-section");
      const processEl = document.getElementById("process-section");
      const reviewsEl = document.getElementById("reviews");
      const faqEl = document.getElementById("faq");

      let currentActive = "visa-info";

      // Precise offsetTop scroll-spy checks to prevent frame lag or flickering
      if (faqEl && scrollPosition >= faqEl.offsetTop) {
        currentActive = "faqs";
      } else if (reviewsEl && scrollPosition >= reviewsEl.offsetTop) {
        currentActive = "reviews";
      } else if (processEl && scrollPosition >= processEl.offsetTop) {
        currentActive = "process";
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
      // Reads the header's own height token rather than a literal. The 57px
      // this used to hardcode was measured against a header that rendered at
      // 61px, so the sub-nav sat 4px underneath it and the gap showed on
      // scroll.
      style={{ top: isSticky ? "0px" : "var(--header-h-compact)" }}
      className={`sticky inset-x-0 w-full z-40 transition-all duration-300 ease-in-out select-none border-b border-slate-100 bg-white ${
        isSticky ? "mt-0" : "mt-8"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6 overflow-x-auto scrollbar-none">
        <div className="flex justify-start items-center gap-8 md:gap-10 h-16 md:h-18 min-w-max">
          {items.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.name}
                href={item.href}
                onClick={(e) => handleClick(e, item.href)}
                className={`group relative h-full flex items-center text-[13px] font-sans tracking-wide transition-colors duration-200 ${
                  isActive 
                    ? "text-slate-900 font-bold" 
                    : "text-muted-foreground hover:text-slate-700 font-medium"
                }`}
              >
                <span className="relative z-10 py-1">{item.name}</span>
                {isActive ? (
                  <motion.div
                    layoutId="activeSubSection"
                    className="absolute left-0 right-0 bottom-0 h-[3px] bg-primary z-10"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                ) : (
                  <div className="absolute left-0 right-0 bottom-0 h-[3px] bg-transparent group-hover:bg-slate-100 transition-colors z-10" />
                )}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
