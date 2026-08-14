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
  /**
   * The persistent action. The reference reveals a guarantee line and a Start
   * Application button on the right of the sub-nav once the hero has scrolled
   * away — so the primary action is never more than a glance away, without
   * competing with the hero while the hero is still on screen.
   *
   * Absent for visa-free destinations: there is nothing to start.
   */
  onStart?: () => void;
  /** "Visa guaranteed in exactly 1 day" — generated from the real SLA. */
  guaranteeLabel?: string;
}

export function SubNavbar({
  isSticky = false,
  sections,
  onStart,
  guaranteeLabel,
}: SubNavbarProps) {
  const [activeSection, setActiveSection] = useState<string>("visa-info");

  /**
   * Five tabs, one per top-level section of the page — the reference's exact
   * set, and now the page's exact set.
   *
   * It used to be seven, because every informational block that had an anchor
   * got a tab: "Gov. Fee Breakdown", "Why Keyrise" and "Additional" each
   * pointed at something that is now *inside* one of these five rather than
   * beside it. A tab per subsection made the rail scroll horizontally on
   * desktop and gave the reader seven destinations for a page with five ideas.
   *
   * The anchors are the section wrappers themselves (`#visa-info`, not
   * `#visas`), so the scroll-spy below resolves against the same boundaries the
   * document is actually divided on.
   */
  const items = [
    { name: "Visa Info", href: "#visa-info", id: "visa-info" },
    { name: "Documents", href: "#documents", id: "documents" },
    // `id` and `href` must name the SAME element: the scroll-spy resolves by
    // id and the click handler by href, so a tab whose two halves disagree
    // scrolls correctly and then never highlights.
    { name: "Visa Process", href: "#visa-process", id: "visa-process" },
    { name: "Reviews", href: "#reviews", id: "reviews" },
    { name: "FAQs", href: "#faqs", id: "faqs" },
  ];

  const visibleItems = sections
    ? items.filter((item) => sections.includes(item.id))
    : items;

  // The effect below re-registers its listener when the *set* of sections
  // changes, not when the array identity does — `visibleItems` is rebuilt on
  // every render, so depending on it directly would tear down and re-attach a
  // scroll listener on each one.
  const sectionKey = visibleItems.map((item) => item.id).join(",");

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
      const passed = [...sectionKey.split(",")].reverse().find((id) => {
        const el = document.getElementById(id);
        if (!el) return false;
        const top = el.getBoundingClientRect().top + window.scrollY;
        return scrollPosition >= top;
      });

      setActiveSection(passed ?? "visa-info");
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial run
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sectionKey]);

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
      /**
       * TWO STATES, and the difference between them is the whole point.
       *
       * At rest this rail sits inside the hero's own section, and a white slab
       * with a bottom rule drawn across it there reads as a *partition* — it
       * cuts the page in half immediately under the hero and announces a
       * boundary that does not exist yet. So at rest it is transparent: no
       * fill, no rule, just the labels sitting on the page ground.
       *
       * Once it pins to the top of the viewport it has to be legible over
       * whatever scrolls beneath it, and that is when it earns the surface, the
       * hairline and the blur. Both are animated on the same properties as the
       * position change, so the bar does not appear to swap for a different
       * component halfway down the page.
       */
      className={[
        "sticky inset-x-0 z-40 w-full select-none border-b",
        "transition-[background-color,border-color,box-shadow,margin] duration-300 ease-in-out",
        isSticky
          ? "mt-0 border-border bg-surface/85 shadow-e1 backdrop-blur-md"
          : "mt-6 border-transparent bg-transparent",
      ].join(" ")}
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
      {/* The rail and the action share one row. The rail keeps its own scroll
          container so the action never scrolls away with it. */}
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 md:px-6">
      <div
        className="min-w-0 flex-1 overflow-x-auto scrollbar-none [mask-image:linear-gradient(to_right,#000_0,#000_calc(100%-40px),transparent_100%)] md:[mask-image:none]"
      >
        {/* Centred while the hero is still on screen, flush left once the
            action appears beside it. The reference does the same, and the
            reason is mechanical rather than decorative: a centred rail with a
            button pinned right reads as two competing alignments, and the tabs
            visibly jump when the button fades in. Shifting the rail at the same
            moment makes it one movement instead of two. */}
        <div
          className={`flex items-center gap-8 md:gap-10 h-16 md:h-18 min-w-max transition-[justify-content] duration-[--duration-base] ${
            isSticky ? "justify-start" : "justify-start md:justify-center"
          }`}
        >
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
                  /* `border` rather than `slate-100`: at rest the rail is
                     transparent and sits on the page ground, which is itself
                     near-slate-100 — the hover indicator was invisible there. */
                  <div className="absolute left-0 right-0 bottom-0 h-[3px] bg-transparent group-hover:bg-border-strong transition-colors z-10" />
                )}
              </a>
            );
          })}
        </div>
      </div>

      {/* The persistent action, desktop only.

          It appears when `isSticky` — i.e. once the hero has left the screen —
          because while the hero is visible its own CTA is the action, and two
          competing primaries is worse than one that arrives late. Hidden below
          md, where the fixed bottom bar already carries it and a second copy
          would take a third of the viewport width. */}
      {onStart && (
        <div
          aria-hidden={!isSticky}
          className={`hidden shrink-0 items-center gap-3 transition-[opacity,transform] duration-[--duration-base] ease-[--ease-out] md:flex ${
            isSticky
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-1 opacity-0"
          }`}
        >
          {guaranteeLabel && (
            <p className="max-w-[9.5rem] text-right text-2xs font-bold leading-tight text-foreground">
              {guaranteeLabel}
            </p>
          )}
          <button
            type="button"
            onClick={onStart}
            tabIndex={isSticky ? 0 : -1}
            className="inline-flex h-11 cursor-pointer items-center rounded-full bg-primary px-6 text-sm font-bold text-on-primary shadow-e1 transition-[background-color,transform] duration-[--duration-fast] ease-[--ease-out] hover:bg-primary-hover active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transform-none"
          >
            Start Application
          </button>
        </div>
      )}
      </div>
    </nav>
  );
}
