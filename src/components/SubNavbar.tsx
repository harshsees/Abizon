"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface SubNavbarProps {
  isSticky?: boolean;
  /**
   * Section ids the page actually rendered. Anything absent is dropped from the
   * nav — "Additional" only exists where a destination declares country-scoped
   * content (one of 154 today), and a tab that scrolls nowhere is worse than no
   * tab. The page passes this because the page is what decides; querying the
   * DOM for it would mean an effect, a state write and a frame of wrong nav.
   */
  sections?: string[];
}

export function SubNavbar({ isSticky = false, sections }: SubNavbarProps) {
  const [activeSection, setActiveSection] = useState<string>("visa-info");

  /**
   * Section names follow the reference's country-page tab set, in Keyrise's
   * own words: the fee tab is explicit that the breakdown is governmental, and
   * "Why Keyrise" replaces the generic "Visa Process" entry because the process
   * is one section down rather than a destination of its own.
   *
   * "Additional" targets whichever country-scoped section a destination
   * declares, so it only resolves where one exists.
   */
  const items = [
    { name: "Visa Info", href: "#visas", id: "visa-info" },
    { name: "Documents", href: "#requirements-section", id: "documents" },
    { name: "Gov. Fee Breakdown", href: "#fee-breakdown", id: "fees" },
    { name: "Why Keyrise", href: "#why-keyrise-section", id: "why" },
    { name: "Reviews", href: "#reviews", id: "reviews" },
    { name: "Additional", href: "#additional-section", id: "additional" },
    { name: "FAQs", href: "#faq", id: "faqs" },
  ];

  const visibleItems = sections
    ? items.filter((item) => sections.includes(item.id))
    : items;

  useEffect(() => {
    const handleScroll = () => {
      const offset = 140; // Spacing threshold below header to activate a section
      const scrollPosition = window.scrollY + offset;

      // Walk the sections in reverse document order and take the first one the
      // scroll position has passed.
      //
      // Measured with getBoundingClientRect + scrollY, NOT offsetTop.
      // `offsetTop` is relative to the nearest positioned ancestor, and these
      // sections live in different containers — the FAQ sits inside its own
      // wrapper, so its offsetTop was ~0 and it matched immediately, leaving
      // "FAQs" highlighted while the user was still looking at the hero.
      const passed = [...visibleItems].reverse().find((item) => {
        const el = document.querySelector<HTMLElement>(item.href);
        if (!el) return false;
        const top = el.getBoundingClientRect().top + window.scrollY;
        return scrollPosition >= top;
      });

      setActiveSection(passed?.id ?? "visa-info");
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
      {/* PHASE 8D §7. The rail scrolls horizontally on mobile, which is right,
          but it was hard-clipped at the viewport edge: at 390 the last item
          ended mid-glyph ("W…") with nothing to say more existed. A reader
          cannot tell a clipped word from a broken layout.

          The mask fades the final 40px so the cut reads as continuation. It is
          a paint effect, not a scroll change — the same items, the same
          positions, and `scrollbar-none` still hides the bar. `mask-image` is
          on the scroll container so the fade sits at the container edge and
          travels with it, rather than over a fixed screen position. */}
      <div
        className="mx-auto max-w-7xl px-4 md:px-6 overflow-x-auto scrollbar-none [mask-image:linear-gradient(to_right,#000_0,#000_calc(100%-40px),transparent_100%)] md:[mask-image:none]"
      >
        <div className="flex justify-start items-center gap-8 md:gap-10 h-16 md:h-18 min-w-max">
          {visibleItems.map((item) => {
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
